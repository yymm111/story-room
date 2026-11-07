#!/usr/bin/env python3
"""Optional, project-local installer for AI narration of newly imported books."""
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path, PurePosixPath
import platform
import shutil
import ssl
import subprocess
import sys
import urllib.request
import venv

ROOT = Path(__file__).resolve().parent
ENV = ROOT / '.local' / 'tts-env'
MODEL = ROOT / '.local/models/Qwen3-TTS-1.7B-CustomVoice-4bit'
REPO = 'mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-4bit'
REVISION = 'f35faf19b0cc2160865af64ecf0f22f83d335135'


def main():
    if platform.system() != 'Darwin' or platform.machine() != 'arm64':
        print('新增书籍的本机 AI 讲述目前适配 Apple 芯片的 Mac。内置的 30 页 Serena 配音仍可直接播放。')
        return
    if not shutil.which('ffmpeg'):
        print('调整新增配音的节奏需要 ffmpeg，请安装后再运行。本书房内置配音仍可直接播放。')
        return
    print('将为这个文件夹安装 AI 语音，不修改系统 Python。首次需要下载约 2.3 GB 模型。', flush=True)
    if not (ENV / 'bin/python').exists():
        venv.create(ENV, with_pip=True)
    python = str(ENV / 'bin/python')
    subprocess.run([python, '-m', 'pip', 'install', '--disable-pip-version-check', 'mlx-audio==0.6.4', 'soundfile==0.14.0'], check=True)
    # Use pip's maintained CA bundle; certificate verification stays enabled.
    certificate = subprocess.check_output([python, '-c', 'from pip._vendor import certifi; print(certifi.where())'], text=True).strip()
    context = ssl.create_default_context(cafile=certificate)
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=context))
    url = 'https://huggingface.co/api/models/' + REPO + '/tree/' + REVISION + '?recursive=true'
    with opener.open(url, timeout=40) as response:
        files = json.load(response)
    MODEL.mkdir(parents=True, exist_ok=True)

    def download(item):
        relative = PurePosixPath(item['path'])
        if relative.is_absolute() or '..' in relative.parts:
            raise RuntimeError('模型文件路径无效。')
        destination = MODEL / relative
        size = item.get('size', 0)
        if destination.exists() and destination.stat().st_size == size:
            return item['path'] + ' 已准备好'
        destination.parent.mkdir(parents=True, exist_ok=True)
        partial = destination.with_suffix(destination.suffix + '.partial')
        offset = partial.stat().st_size if partial.exists() else 0
        headers = {'User-Agent': 'StoryGarden-local-installer'}
        if offset:
            headers['Range'] = 'bytes=' + str(offset) + '-'
        request = urllib.request.Request('https://huggingface.co/' + REPO + '/resolve/' + REVISION + '/' + item['path'], headers=headers)
        with opener.open(request, timeout=90) as response:
            if offset and response.status != 206:
                offset = 0
            with partial.open('ab' if offset else 'wb') as output:
                while data := response.read(4 * 1024 * 1024):
                    output.write(data)
        if partial.stat().st_size != size:
            raise RuntimeError(item['path'] + ' 没有下载完整，再运行一次即可继续。')
        partial.replace(destination)
        return item['path'] + ' 下载完成'

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(download, item) for item in files if item['type'] == 'file' and item['path'] != '.gitattributes']
        for future in as_completed(futures):
            print(future.result(), flush=True)
    (MODEL / 'source.json').write_text(json.dumps({'repo': REPO, 'revision': REVISION}))
    subprocess.run([python, '-c', 'import mlx.core as mx; assert mx.metal.is_available(); print("Apple GPU 已就绪")'], check=True)
    print('AI 语音已准备好。重新启动故事书房后，导入的书也能由 Serena 讲述。', flush=True)


if __name__ == '__main__':
    main()
