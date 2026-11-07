#!/usr/bin/env python3
"""Loopback-only static server and optional macOS Vision OCR. Python 3 stdlib only."""
import argparse
import functools
import gzip
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import threading
import re
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from tts_engine import TtsEngine

ROOT = Path(__file__).resolve().parent
OCR_BIN = ROOT / '.local' / 'story-ocr'
OCR_AVAILABLE = False
OCR_LOCK = threading.Semaphore(2)
TTS = TtsEngine(ROOT)
GZIP_CACHE = {}
GZIP_LOCK = threading.Lock()
COMPRESSIBLE_SUFFIXES = {'.js', '.mjs', '.css', '.html', '.json', '.svg', '.txt', '.md', '.wasm'}


def gzip_payload(file_path, stat):
    key = str(file_path)
    with GZIP_LOCK:
        cached = GZIP_CACHE.get(key)
        if cached and cached[0] == stat.st_mtime_ns and cached[1] == stat.st_size:
            return cached[2]
    payload = gzip.compress(file_path.read_bytes(), compresslevel=6)
    with GZIP_LOCK:
        if len(GZIP_CACHE) >= 128:
            GZIP_CACHE.clear()
        GZIP_CACHE[key] = (stat.st_mtime_ns, stat.st_size, payload)
    return payload


def prepare_ocr():
    if platform.system() != 'Darwin' or not shutil.which('swiftc'):
        return False
    source = ROOT / 'ocr.swift'
    if OCR_BIN.exists() and OCR_BIN.stat().st_mtime >= source.stat().st_mtime:
        return True
    OCR_BIN.parent.mkdir(exist_ok=True)
    print('正在准备本机文字识别，首次启动约需半分钟…', flush=True)
    try:
        cache = Path(tempfile.gettempdir()) / 'story-garden-swift-cache'
        result = subprocess.run(['swiftc', '-O', '-module-cache-path', str(cache), str(source), '-o', str(OCR_BIN), '-framework', 'Vision', '-framework', 'ImageIO'], capture_output=True, timeout=90)
        if result.returncode:
            print('文字识别未就绪。文字书仍可正常导入；图片可手动补充文字。', flush=True)
            print(result.stderr.decode(errors='replace')[-1500:], flush=True)
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired) as error:
        print(f'本机文字识别暂不可用：{error}', flush=True)
        return False


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.avif': 'image/avif', '.gz': 'application/gzip'}

    def serve_file(self, file_path, content_type, cache_control):
        try:
            stat = file_path.stat()
        except OSError:
            self.send_error(404)
            return
        etag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}"'
        modified_since = self.headers.get('If-Modified-Since')
        not_modified = self.headers.get('If-None-Match') == etag
        if not not_modified and modified_since:
            try:
                not_modified = parsedate_to_datetime(modified_since).timestamp() >= int(stat.st_mtime)
            except (ValueError, TypeError):
                pass
        if not_modified:
            self.send_response(304)
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', cache_control)
            self.end_headers()
            return
        data = None
        range_header = self.headers.get('Range')
        if (not range_header and file_path.suffix.lower() in COMPRESSIBLE_SUFFIXES
                and stat.st_size > 1024 and 'gzip' in self.headers.get('Accept-Encoding', '')):
            data = gzip_payload(file_path, stat)
        total = len(data) if data is not None else stat.st_size
        start, end, status = 0, total - 1, 200
        if range_header and data is None:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header.strip())
            if match and (match.group(1) or match.group(2)):
                if match.group(1):
                    start = int(match.group(1))
                    end = min(int(match.group(2)), total - 1) if match.group(2) else total - 1
                else:
                    start = max(0, total - int(match.group(2)))
                if start <= end and start < total:
                    status = 206
                else:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{total}')
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('ETag', etag)
        self.send_header('Cache-Control', cache_control)
        self.send_header('Accept-Ranges', 'bytes')
        if data is not None:
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
        self.end_headers()
        if self.command == 'HEAD':
            return
        try:
            if data is not None:
                self.wfile.write(data)
            else:
                with file_path.open('rb') as stream:
                    stream.seek(start)
                    remaining = end - start + 1
                    while remaining > 0:
                        chunk = stream.read(min(remaining, 256 * 1024))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def allowed(self):
        host = self.headers.get('Host', '')
        allowed_hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        if host not in allowed_hosts:
            self.send_error(403, 'Local access only')
            return False
        return True

    def json_response(self, value, status=200):
        payload = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
        super().end_headers()

    def do_GET(self):
        if not self.allowed():
            return
        path = urlsplit(self.path).path
        if path == '/api/health':
            return self.json_response({'ok': True, 'ocr': OCR_AVAILABLE, 'platform': platform.system(), 'tts': {'available': TTS.available, 'status': TTS.status, 'voice': 'Serena', 'engine': 'Qwen3-TTS-1.7B-4bit'}})
        if path.startswith('/api/tts/'):
            if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                return self.json_response({'error': '只允许本机书房读取声音。'}, 403)
            job = re.fullmatch(r'/api/tts/jobs/([a-f0-9]{64})', path)
            if job:
                data = TTS.get(job.group(1))
                return self.json_response(data, 404 if data['status'] == 'missing' else 200)
            sound = re.fullmatch(r'/api/tts/audio/([a-f0-9]{64})\.wav', path)
            if sound:
                audio = TTS.cache / (sound.group(1) + '.wav')
                if not audio.exists():
                    return self.json_response({'error': '声音还在准备中。'}, 404)
                return self.serve_file(audio, 'audio/wav', 'private, max-age=31536000, immutable')
            return self.json_response({'error': '语音接口不存在。'}, 404)
        if path.startswith(('/.', '/ocr.swift', '/启动故事书房.command')) or path.endswith('.py'):
            self.send_error(404)
            return
        split = urlsplit(self.path)
        file_path = Path(self.translate_path(split.path))
        if file_path.is_dir():
            file_path = file_path / 'index.html'
        if not file_path.is_file():
            self.send_error(404)
            return
        immutable = 'v=' in split.query or path.startswith(('/vendor/', '/assets/audio/library/'))
        cache_control = 'public, max-age=31536000, immutable' if immutable else 'no-cache'
        self.serve_file(file_path, self.guess_type(str(file_path)), cache_control)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_POST(self):
        if not self.allowed():
            return
        port = self.server.server_port
        origin = self.headers.get('Origin', '')
        if origin not in {f'http://127.0.0.1:{port}', f'http://localhost:{port}'} or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            return self.json_response({'error': '只接受本机书房发起的识别请求。'}, 403)
        path = urlsplit(self.path).path
        if path == '/api/tts':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 20000:
                    return self.json_response({'error': '这一段文字太长，请分段阅读。'}, 413)
                data = json.loads(self.rfile.read(length))
                text = data.get('text', '')
                voice = data.get('voice', 'Serena')
                if not isinstance(text, str) or not text.strip() or len(text) > 1800:
                    return self.json_response({'error': '每次可合成 1 到 1800 个字。'}, 400)
                if voice not in {'Serena', 'Uncle_Fu'}:
                    return self.json_response({'error': '请选择 Serena 或 Uncle_Fu。'}, 400)
                return self.json_response(TTS.submit(text, voice))
            except (ValueError, TypeError):
                return self.json_response({'error': '语音请求格式有误。'}, 400)
            except RuntimeError as error:
                return self.json_response({'error': str(error)}, 503)
        if path != '/api/ocr':
            return self.json_response({'error': '接口不存在'}, 404)
        if not OCR_AVAILABLE:
            return self.json_response({'error': '本机文字识别未就绪，可以先手动补充文字。'}, 503)
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= 20 * 1024 * 1024:
            return self.json_response({'error': '图片需要小于 20 MB。'}, 413)
        if self.headers.get('Content-Type', '').split(';')[0] not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'}:
            return self.json_response({'error': '请选择一张图片。'}, 415)
        if not OCR_LOCK.acquire(blocking=False):
            return self.json_response({'error': '本机正在识别其他书页，请稍等再试。'}, 429)
        name = None
        try:
            self.connection.settimeout(30)
            image = self.rfile.read(length)
            if len(image) != length:
                return self.json_response({'error': '图片没有接收完整，请重试。'}, 400)
            with tempfile.NamedTemporaryFile(prefix='story-page-', suffix='.image', delete=False) as file:
                file.write(image)
                name = file.name
            result = subprocess.run([str(OCR_BIN), name], capture_output=True, timeout=45)
            data = json.loads(result.stdout)
            self.json_response(data, 200 if result.returncode == 0 else 422)
        except (OSError, ValueError, subprocess.TimeoutExpired):
            self.json_response({'error': '这张图片没有识别成功，请重试或手动补充文字。'}, 422)
        finally:
            if name:
                Path(name).unlink(missing_ok=True)
            OCR_LOCK.release()

    def log_message(self, format, *args):
        if args and str(args[0]).startswith('POST /api/ocr'):
            print('已处理一页本机文字识别。', flush=True)


class LocalServer(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description='启动本地故事书房')
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    global OCR_AVAILABLE
    OCR_AVAILABLE = prepare_ocr()
    handler = functools.partial(Handler, directory=str(ROOT))
    try:
        server = LocalServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        print(f'本地服务未能启动：{error}。如果端口已被占用，可使用 --port 更换端口。', flush=True)
        return
    url = f'http://127.0.0.1:{args.port}'
    print(f'\n故事书房已准备好：{url}\n本机文字识别：{"可用" if OCR_AVAILABLE else "未启用"}\n按 Control+C 关闭书房。', flush=True)
    if not args.no_open:
        import webbrowser
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n故事书房已关闭，浏览器里保存的书籍仍会保留。', flush=True)
    finally:
        TTS.close()
        server.server_close()


if __name__ == '__main__':
    main()
