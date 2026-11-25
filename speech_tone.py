"""Gentle page-wide register matching; never flatten Mandarin pitch contours."""
import shutil
import subprocess
import numpy as np

PROFILE = 'serena-register-v1'
TARGET_HZ = 235.0
MAX_SEMITONES = 3.0


def pitch_summary(audio, sample_rate):
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    # Work near 16 kHz with deterministic linear resampling for analysis only.
    count = round(len(audio)*16000/sample_rate)
    if count < 800:
        return None
    data = np.interp(np.linspace(0,len(audio)-1,count),np.arange(len(audio)),audio)
    frames = np.lib.stride_tricks.sliding_window_view(data,800)[::320].copy()
    frames -= frames.mean(axis=1,keepdims=True)
    levels = np.sqrt(np.mean(frames*frames,axis=1))
    frames *= np.hanning(800)
    spectrum = np.fft.rfft(frames,n=2048)
    acf = np.fft.irfft(spectrum*spectrum.conj(),n=2048)[:,:800]
    values = []
    for row,level in zip(acf,levels):
        if level < .012 or row[0] <= 0:
            continue
        row = row/row[0]
        lo,hi = 32,178
        peaks = np.flatnonzero((row[lo:hi]>row[lo-1:hi-1]) & (row[lo:hi]>=row[lo+1:hi+1]))+lo
        if not len(peaks):
            continue
        threshold = max(.45,float(max(row[peaks]))*.9)
        candidates = peaks[row[peaks]>=threshold]
        if len(candidates):
            values.append(16000/float(candidates[0]))
    if len(values) < 60:
        return None
    low,median,high = np.percentile(values,[10,50,90])
    return {'p10Hz':round(float(low),2),'medianHz':round(float(median),2),
            'p90Hz':round(float(high),2),'voicedFrames':len(values)}


def steady_register(audio, sample_rate, voice='Serena'):
    audio = np.asarray(audio,dtype=np.float32).reshape(-1)
    measured = pitch_summary(audio,sample_rate)
    if voice.lower() != 'serena' or measured is None:
        return audio,{'profile':PROFILE,'factor':1.0,'reason':'Different voice or insufficient voiced frames','measured':measured}
    limit = 2**(MAX_SEMITONES/12)
    factor = float(np.clip(TARGET_HZ/measured['medianHz'],1/limit,limit))
    # Leave less than a quarter-tone alone to avoid unnecessary processing.
    if abs(12*np.log2(factor)) < .25:
        factor = 1.0
    result = audio
    if factor != 1:
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            raise RuntimeError('统一旁白音区需要本机 ffmpeg。')
        converted = subprocess.run([ffmpeg,'-hide_banner','-loglevel','error',
            '-f','f32le','-ar',str(sample_rate),'-ac','1','-i','pipe:0',
            '-af',f'rubberband=tempo=1:pitch={factor:.7f}:formant=preserved:pitchq=quality:transients=smooth:detector=soft',
            '-f','f32le','pipe:1'],input=audio.astype('<f4').tobytes(),capture_output=True,timeout=90)
        if converted.returncode:
            raise RuntimeError('统一旁白音区需要支持 rubberband 的 ffmpeg。')
        result = np.frombuffer(converted.stdout,dtype='<f4').copy()
        if not len(result) or not np.isfinite(result).all() or abs(len(result)-len(audio))>sample_rate*.08:
            raise ValueError('音区校准未通过时长或有效声音检查。')
    return result,{'profile':PROFILE,'targetHz':TARGET_HZ,'factor':round(factor,7),
                   'maxSemitones':MAX_SEMITONES,'measured':measured,
                   'method':'One constant pitch ratio for the entire page; tempo and formants preserved. No syllable-level contour flattening.'}
