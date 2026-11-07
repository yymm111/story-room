"""Conservative silence cleanup and pitch-preserving tempo for local narration."""
import shutil
import subprocess
import numpy as np

RHYTHM_VERSION = 'natural-v3'
TEMPO = 1.08
QUIET_DB = -45


def quiet_spans(audio, sample_rate):
    """Require every sample in a 10 ms window to be quiet; retain soft consonants."""
    hop = max(1, round(sample_rate * .01))
    threshold = 10 ** (QUIET_DB / 20)
    spans, start = [], None
    for at in range(0, len(audio), hop):
        quiet = np.max(np.abs(audio[at:at + hop])) < threshold
        if quiet and start is None:
            start = at
        if not quiet and start is not None:
            spans.append((start, at))
            start = None
    if start is not None:
        spans.append((start, len(audio)))
    return spans


def tighten(audio, sample_rate):
    cuts = []
    for start, end in quiet_spans(audio, sample_rate):
        length = end - start
        if start == 0:
            keep = round(.08 * sample_rate)
            if length > keep:
                cuts.append((start, end - keep))
        elif end == len(audio):
            keep = round(.12 * sample_rate)
            if length > keep:
                cuts.append((start + keep, end))
        elif length > .65 * sample_rate:
            # Short pauses are untouched. Keep both edges of a long quiet region.
            half = round(.19 * sample_rate)
            cuts.append((start + half, end - half))
    pieces, cursor = [], 0
    for start, end in cuts:
        pieces.append(audio[cursor:start])
        cursor = end
    pieces.append(audio[cursor:])
    return np.concatenate(pieces), sum(end - start for start, end in cuts)


def polish(audio, sample_rate, parts=None):
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    if not len(audio) or not np.isfinite(audio).all() or np.max(np.abs(audio)) < .0001:
        raise ValueError('没有生成有效的人声，请重试。')
    # Use reliable synthesis boundaries when available; otherwise clean the whole page.
    parts = parts or []
    usable = bool(parts) and abs(parts[0]['start']) < .02
    cursor = 0
    for part in parts:
        start = round(part['start'] * sample_rate)
        end = round((part['start'] + part['duration']) * sample_rate)
        usable = usable and abs(start - cursor) <= 2 and end > start and end <= len(audio) + 2
        cursor = end
    usable = usable and abs(cursor - len(audio)) <= 2
    segments = parts if usable else [{'start': 0, 'duration': len(audio) / sample_rate}]
    pieces, boundaries, elapsed, removed = [], [], 0, 0
    for index, part in enumerate(segments):
        start = round(part['start'] * sample_rate)
        end = round((part['start'] + part['duration']) * sample_rate)
        segment, cut = tighten(audio[start:end], sample_rate)
        removed += cut
        if index:
            # Trimmed edge silence plus this gap is roughly half a second at normal speed.
            gap = np.zeros(round(.28 * sample_rate), dtype=np.float32)
            pieces.append(gap)
            elapsed += len(gap)
        boundaries.append({**part, 'start': elapsed / sample_rate / TEMPO,
                           'duration': len(segment) / sample_rate / TEMPO})
        pieces.append(segment)
        elapsed += len(segment)
    waveform = np.concatenate(pieces)
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('调整讲述节奏需要本机 ffmpeg。')
    result = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error',
        '-f', 'f32le', '-ar', str(sample_rate), '-ac', '1', '-i', 'pipe:0',
        '-af', f'atempo={TEMPO}', '-f', 'f32le', 'pipe:1'],
        input=waveform.astype('<f4').tobytes(), capture_output=True, check=True, timeout=60)
    output = np.frombuffer(result.stdout, dtype='<f4').copy()
    if not len(output) or not np.isfinite(output).all():
        raise ValueError('调整后的声音无效。')
    # Encoder/tempo rounding can shorten the last few milliseconds.
    duration = len(output) / sample_rate
    for part in boundaries:
        part['start'] = min(duration, part['start'])
        part['duration'] = max(0, min(part['duration'], duration - part['start']))
    return output, boundaries if usable else [], {
        'rhythmVersion': RHYTHM_VERSION, 'tempo': TEMPO,
        'sourceDuration': len(audio) / sample_rate,
        'removedSilenceSeconds': round(removed / sample_rate, 3),
        'duration': round(duration, 3)}
