"""JSON-lines worker. Only this isolated process imports MLX or holds GPU weights."""
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / '.local' / 'tts-cache'
STYLE = 'story-garden-serena-v3'
INSTRUCTION = '请用温暖、柔和、自然的声音给小朋友讲睡前故事。使用自然流畅的日常语速，不刻意拖长字音；句间轻轻停顿，段落之间稍作停顿，有轻柔的情绪起伏，清晰但不要生硬的播音腔。'


def audio_key(text, voice='Serena'):
    text = text.replace('\r\n', '\n').strip()
    return hashlib.sha256((STYLE + '\n' + voice.lower() + '\n' + text).encode()).hexdigest()


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def chunks(text, limit=180):
    result = []
    for paragraph in text.split('\n'):
        current = ''
        for sentence in re.split(r'(?<=[。！？!?])', paragraph):
            if len(current) + len(sentence) > limit and current:
                result.append(current)
                current = ''
            while len(sentence) > limit:
                result.append(sentence[:limit])
                sentence = sentence[limit:]
            current += sentence
        if current.strip():
            result.append(current)
    return result


def main():
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    import numpy as np
    import soundfile as sf
    from speech_rhythm import polish
    from mlx_audio.tts.utils import load_model
    CACHE.mkdir(parents=True, exist_ok=True)
    emit({'event': 'loading'})
    with contextlib.redirect_stdout(sys.stderr):
        model = load_model(str(ROOT / '.local/models/Qwen3-TTS-1.7B-CustomVoice-4bit'))
    emit({'event': 'ready'})
    for line in sys.stdin:
        request = json.loads(line)
        text = request['text'].replace('\r\n', '\n').strip()
        voice = request.get('voice', 'Serena')
        key = audio_key(text, voice)
        try:
            output = CACHE / (key + '.wav')
            metadata = CACHE / (key + '.json')
            if output.exists() and metadata.exists() and not request.get('refresh'):
                emit({'event': 'complete', 'key': key, **json.loads(metadata.read_text())})
                continue
            start = time.monotonic()
            pieces, boundaries = [], []
            parts = chunks(text)
            sample_rate = 24000
            elapsed_audio = 0
            for index, part in enumerate(parts):
                emit({'event': 'progress', 'key': key, 'part': index + 1, 'parts': len(parts)})
                with contextlib.redirect_stdout(sys.stderr):
                    for result in model.generate_custom_voice(text=part, speaker=voice, language='Chinese' if re.search(r'[\u3400-\u9fff]', part) else 'English', instruct=INSTRUCTION, temperature=.65, top_p=.9, repetition_penalty=1.05, max_tokens=min(8192, max(500, len(part) * 12)), verbose=False):
                        audio = np.asarray(result.audio, dtype=np.float32).reshape(-1)
                        pieces.append(audio)
                        sample_rate = result.sample_rate
                        duration = len(audio) / sample_rate
                        boundaries.append({'text': part, 'start': elapsed_audio, 'duration': duration})
                        elapsed_audio += duration
            waveform, boundaries, rhythm = polish(np.concatenate(pieces), sample_rate, boundaries)
            peak = float(np.max(np.abs(waveform)))
            if peak < .0001:
                raise RuntimeError('没有生成有效的人声，请重试。')
            waveform *= min(6, .82 / peak)
            temporary = output.with_suffix('.partial.wav')
            sf.write(temporary, waveform, sample_rate, subtype='PCM_16')
            temporary.replace(output)
            data = {'voice': voice, 'duration': round(len(waveform) / sample_rate, 3), 'sampleRate': sample_rate, 'generationSeconds': round(time.monotonic() - start, 2), 'parts': boundaries, 'engine': 'Qwen3-TTS-1.7B-4bit', **rhythm}
            temporary_metadata = metadata.with_suffix('.partial.json')
            temporary_metadata.write_text(json.dumps(data, ensure_ascii=False))
            temporary_metadata.replace(metadata)
            emit({'event': 'complete', 'key': key, **data})
        except Exception as error:
            emit({'event': 'error', 'key': key, 'error': str(error)})


if __name__ == '__main__':
    main()
