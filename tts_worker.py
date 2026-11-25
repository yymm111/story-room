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
# Bump STYLE together with the frontend whenever tone/model settings change.
STYLE = 'story-garden-serena-v5'
TONE_PROFILE = 'steady-narrator-v1'
INSTRUCTION = '请用同一位亲切、平静的普通话旁白朗读全文。声音保持自然中声区，音量稳定，句子层面的情绪起伏轻微。保留每个汉字正确的普通话声调。对话和旁白始终使用同一个声音、同一种口吻，问句只轻微上扬，陈述句平稳收尾。全篇保持连贯的日常语速，每秒约四个汉字，句间短暂停顿。不扮演人物，不使用夸张惊叹、笑声、气声、唱读或拖长的尾音。只朗读给定文字。'
SYNTHESIS_SETTINGS = {'temperature': .25, 'top_p': .8, 'repetition_penalty': 1.12}


def audio_key(text, voice='Serena'):
    text = text.replace('\r\n', '\n').strip()
    return hashlib.sha256((STYLE + '\n' + voice.lower() + '\n' + text).encode()).hexdigest()


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def chunks(text, limit=75, join_paragraphs=False):
    result = []
    for paragraph in ([text] if join_paragraphs else text.split('\n')):
        current = ''
        for sentence in re.findall(r'[^。！？!?]+[。！？!?]*[”’」』\"]*', paragraph):
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
    import mlx.core as mx
    import soundfile as sf
    from speech_rhythm import polish, acceptable_pace, speech_units, pace_metrics
    from speech_tone import steady_register
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
            # Keep page context: separately voiced quotes can change delivery.
            parts = chunks(text, limit=160, join_paragraphs=True)
            sample_rate = 24000
            elapsed_audio = 0
            for index, part in enumerate(parts):
                emit({'event': 'progress', 'key': key, 'part': index + 1, 'parts': len(parts)})
                accepted = False
                rejections = []
                for attempt in range(3):
                    seed = int(hashlib.sha256((voice+TONE_PROFILE).encode()).hexdigest()[:8],16)+attempt
                    mx.random.seed(seed)
                    generated = []
                    # Leave ample room for EOS; duration is checked independently.
                    # A tight token budget can cut an otherwise normal sentence.
                    max_tokens = min(4096, max(256, speech_units(part)*16+128))
                    truncated = False
                    # Normalize theatrical punctuation, retaining every word.
                    # Retries keep exactly the same tone and sampling settings.
                    model_text=re.sub(r'[“”「」『』\"]','',part).replace('\n',' ')
                    model_text=re.sub(r'—{2,}|…{2,}','，',model_text).replace('！','。')
                    with contextlib.redirect_stdout(sys.stderr):
                        for result in model.generate_custom_voice(text=model_text, speaker=voice, language='Chinese' if re.search(r'[\u3400-\u9fff]', part) else 'English', instruct=INSTRUCTION, **SYNTHESIS_SETTINGS, max_tokens=max_tokens, verbose=False):
                            generated.append(np.asarray(result.audio,dtype=np.float32).reshape(-1))
                            sample_rate = result.sample_rate
                            truncated |= result.token_count >= max_tokens
                    audio = np.concatenate(generated) if generated else np.array([],dtype=np.float32)
                    if len(audio) and np.isfinite(audio).all() and np.max(np.abs(audio))>.0001 and not truncated and acceptable_pace(audio,sample_rate,part):
                        accepted = True
                        break
                    rejections.append({'attempt':attempt+1,'part':index+1,'text':part,'truncated':bool(truncated),'tokenLimit':max_tokens,**pace_metrics(audio,sample_rate,part)})
                    emit({'event':'progress','key':key,'part':index+1,'parts':len(parts),'retry':attempt+1})
                if not accepted:
                    (CACHE/(key+'.rejected.json')).write_text(json.dumps(rejections,ensure_ascii=False,indent=2))
                    raise RuntimeError('这一段声音连续生成不稳定，未使用异常音频；请稍后重试。')
                pieces.append(audio)
                duration = len(audio)/sample_rate
                boundaries.append({'text':part,'start':elapsed_audio,'duration':duration})
                elapsed_audio += duration
            waveform, boundaries, rhythm = polish(np.concatenate(pieces), sample_rate, boundaries)
            before_tone = len(waveform)
            waveform, tone_register = steady_register(waveform,sample_rate,voice)
            duration_ratio = len(waveform)/before_tone
            for boundary in boundaries:
                boundary['start'] *= duration_ratio
                boundary['duration'] *= duration_ratio
            rhythm['duration'] = round(len(waveform)/sample_rate,3)
            peak = float(np.max(np.abs(waveform)))
            if peak < .0001:
                raise RuntimeError('没有生成有效的人声，请重试。')
            waveform *= min(6, .82 / peak)
            temporary = output.with_suffix('.partial.wav')
            sf.write(temporary, waveform, sample_rate, subtype='PCM_16')
            temporary.replace(output)
            data = {'voice': voice, 'duration': round(len(waveform) / sample_rate, 3), 'sampleRate': sample_rate, 'generationSeconds': round(time.monotonic() - start, 2), 'parts': boundaries, 'engine': 'Qwen3-TTS-1.7B-4bit', 'toneProfile':TONE_PROFILE,'instructionHash':hashlib.sha256(INSTRUCTION.encode()).hexdigest(),'synthesisSettings':SYNTHESIS_SETTINGS,'toneRegister':tone_register, **rhythm}
            temporary_metadata = metadata.with_suffix('.partial.json')
            temporary_metadata.write_text(json.dumps(data, ensure_ascii=False))
            temporary_metadata.replace(metadata)
            emit({'event': 'complete', 'key': key, **data})
        except Exception as error:
            emit({'event': 'error', 'key': key, 'error': str(error)})


if __name__ == '__main__':
    main()
