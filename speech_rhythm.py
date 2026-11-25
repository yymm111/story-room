"""Measured, bounded narration pacing. Never speed up pathological synthesis."""
import re
import shutil
import subprocess
import numpy as np

RHYTHM_VERSION = 'balanced-v4'
TARGET_CPS = 3.8
PACE_BAND = (3.4, 4.3)
TEMPO_LIMITS = (.80, 1.25)
QUIET_DB = -45


def speech_units(text):
    # Latin words are units, not individual letters. Long numbers are excluded
    # from quality rejection because written digits do not predict spoken length.
    return len(re.findall(r'[\u3400-\u9fff]|[A-Za-z]+|[0-9]', text or ''))


def pace_metrics(audio, sample_rate, text):
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    quiet = sum(end-start for start, end in quiet_spans(audio, sample_rate))
    active = (len(audio)-quiet)/sample_rate
    units = speech_units(text)
    measurable = bool(re.search(r'[\u3400-\u9fff]', text or '')) and units >= 8
    return {'units': units, 'activeSeconds': active,
            'activeCps': units/max(active, .01), 'measurable': measurable}


def acceptable_pace(audio, sample_rate, text):
    metrics = pace_metrics(audio, sample_rate, text)
    # This is a windowed silence estimate, not exact syllable alignment.
    # Allow a small boundary tolerance so a complete 2.68 cps take is not
    # discarded as pathological merely for missing 2.70 by less than 1%.
    return not metrics['measurable'] or 2.65 <= metrics['activeCps'] <= 5.2


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
            keep = round(.04 * sample_rate)
            if length > keep:
                cuts.append((start, end - keep))
        elif end == len(audio):
            keep = round(.06 * sample_rate)
            if length > keep:
                cuts.append((start + keep, end))
        elif length > .55 * sample_rate:
            # Short pauses are untouched. Keep both edges of a long quiet region.
            half = round(.16 * sample_rate)
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
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('调整讲述节奏需要本机 ffmpeg。')
    pieces, boundaries, elapsed, removed, tempos = [], [], 0, 0, []
    for index, part in enumerate(segments):
        start = round(part['start'] * sample_rate)
        end = round((part['start'] + part['duration']) * sample_rate)
        segment, cut = tighten(audio[start:end], sample_rate)
        removed += cut
        text = part.get('text', '')
        metrics = pace_metrics(segment, sample_rate, text)
        if not acceptable_pace(segment, sample_rate, text):
            raise ValueError('配音语速异常，需要重新生成这一段。')
        tempo = 1.0
        if metrics['measurable'] and not PACE_BAND[0] <= metrics['activeCps'] <= PACE_BAND[1]:
            tempo = float(np.clip(TARGET_CPS/metrics['activeCps'], *TEMPO_LIMITS))
        if abs(tempo-1) > .001:
            result = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error',
                '-f', 'f32le', '-ar', str(sample_rate), '-ac', '1', '-i', 'pipe:0',
                '-af', f'atempo={tempo:.6f}', '-f', 'f32le', 'pipe:1'],
                input=segment.astype('<f4').tobytes(), capture_output=True, check=True, timeout=60)
            segment = np.frombuffer(result.stdout, dtype='<f4').copy()
        if not len(segment) or not np.isfinite(segment).all():
            raise ValueError('调整后的声音无效。')
        tempos.append(round(tempo, 5))
        if index:
            gap = np.zeros(round((.16 if part.get('join') == 'sentence' else .28)*sample_rate), dtype=np.float32)
            pieces.append(gap)
            elapsed += len(gap)
        boundaries.append({**part, 'start': elapsed/sample_rate,
                           'duration': len(segment)/sample_rate, 'tempo': round(tempo, 5)})
        pieces.append(segment)
        elapsed += len(segment)
    waveform = np.concatenate(pieces)
    output = waveform
    # Encoder/tempo rounding can shorten the last few milliseconds.
    duration = len(output) / sample_rate
    for part in boundaries:
        part['start'] = min(duration, part['start'])
        part['duration'] = max(0, min(part['duration'], duration - part['start']))
    return output, boundaries if usable else [], {
        'rhythmVersion': RHYTHM_VERSION, 'tempos': tempos,
        'sourceDuration': len(audio) / sample_rate,
        'removedSilenceSeconds': round(removed / sample_rate, 3),
        'duration': round(duration, 3)}
