"""Bounded local synthesis queue with durable audio caching and an isolated GPU worker."""
import atexit
import json
from pathlib import Path
import queue
import subprocess
import threading
import time
from tts_worker import audio_key


class TtsEngine:
    def __init__(self, root):
        self.root = Path(root)
        self.python = self.root / '.local/tts-env/bin/python'
        self.model = self.root / '.local/models/Qwen3-TTS-1.7B-CustomVoice-4bit/model.safetensors'
        self.cache = self.root / '.local/tts-cache'
        self.jobs = {}
        self.queue = queue.Queue(maxsize=8)
        self.lock = threading.Lock()
        self.process = None
        self.status = 'idle'
        self.thread = None
        atexit.register(self.close)

    @property
    def available(self):
        return self.python.exists() and self.model.exists()

    def cached(self, key):
        metadata = self.cache / (key + '.json')
        if not metadata.exists() or not (self.cache / (key + '.wav')).exists():
            return None
        try:
            data = json.loads(metadata.read_text())
        except (OSError, ValueError):
            return None
        return {'status': 'ready', 'jobId': key, 'url': '/api/tts/audio/' + key + '.wav', **data}

    def submit(self, text, voice):
        if not self.available:
            raise RuntimeError('本机 AI 语音环境尚未安装。内置《小王子》的 Serena 声音可直接播放。')
        key = audio_key(text, voice)
        cached = self.cached(key)
        if cached:
            return cached
        with self.lock:
            if key in self.jobs and self.jobs[key]['status'] != 'error':
                return dict(self.jobs[key])
            if self.queue.full():
                raise RuntimeError('正在准备其他书页的声音，请稍等片刻再试。')
            job = {'status': 'queued', 'jobId': key, 'voice': voice, 'created': time.time()}
            self.jobs[key] = job
            self.queue.put_nowait({'key': key, 'text': text, 'voice': voice})
            if not self.thread or not self.thread.is_alive():
                self.thread = threading.Thread(target=self.run, daemon=True)
                self.thread.start()
            return dict(job)

    def get(self, key):
        return self.cached(key) or dict(self.jobs.get(key, {'status': 'missing'}))

    def start_worker(self):
        self.status = 'loading'
        log = (self.root / '.local/tts-worker.log').open('a')
        self.process = subprocess.Popen([str(self.python), '-u', str(self.root / 'tts_worker.py')], cwd=self.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1)
        log.close()
        for line in self.process.stdout:
            data = json.loads(line)
            if data.get('event') == 'ready':
                self.status = 'ready'
                return
        raise RuntimeError('本机 AI 语音启动失败，请查看语音服务日志。')

    def run(self):
        while True:
            try:
                request = self.queue.get(timeout=120)
            except queue.Empty:
                with self.lock:
                    if not self.queue.empty():
                        continue
                    self.close()
                    self.thread = None
                    return
            key = request['key']
            try:
                if not self.process or self.process.poll() is not None:
                    self.start_worker()
                self.jobs[key].update(status='generating')
                self.process.stdin.write(json.dumps(request, ensure_ascii=False) + '\n')
                self.process.stdin.flush()
                for line in self.process.stdout:
                    result = json.loads(line)
                    if result.get('event') == 'progress':
                        self.jobs[key].update(part=result['part'], parts=result['parts'])
                    elif result.get('event') == 'complete':
                        self.jobs[key].update(self.cached(key))
                        break
                    elif result.get('event') == 'error':
                        raise RuntimeError(result.get('error', '语音生成失败'))
                else:
                    raise RuntimeError('AI 语音进程已停止，请重试。')
            except Exception as error:
                self.jobs[key].update(status='error', error=str(error))
                self.close()
            finally:
                self.queue.task_done()

    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process = None
        self.status = 'idle'
