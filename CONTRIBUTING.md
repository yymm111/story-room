# 一起开发 Story Room

## 启动

1. 安装 Python 3；检查 JavaScript 语法还需要 Node.js。
2. 克隆仓库并进入目录：

```sh
git clone https://github.com/yymm111/story-room.git
cd story-room
python3 server.py --port 8766
```

浏览器访问 http://127.0.0.1:8766/ 。前端依赖已放在 `vendor/`，无需安装 npm 依赖或执行打包。内置 40 页配音可直接播放。

新增文字的 AI 配音为可选能力，需要 Apple 芯片 Mac、ffmpeg，以及通过 `python3 setup_ai_voice.py` 安装的本机语音环境。模型、环境、缓存和浏览器阅读数据不在仓库中。图片文字识别依赖 macOS Vision 和本机 Swift 编译器；不可用时仍可手动填写正文。

## 修改和提交

- 从 `main` 创建个人功能分支，在自己的分支提交，通过 Pull Request 合并。
- 改动前先同步 `main`。不要直接覆盖其他人的提交。
- 提交前执行 `npm run check`；修改 Python 时检查相关文件语法。根据影响范围在浏览器确认：首页选书、阅读返回、配音等。
- `.local/` 只存机器状态，不要提交模型、环境、缓存、账号信息或密钥。
- 书籍正文与元数据在 `stories.js`、`otto-book.js`、`prince-book.js`；首页在 `app.js`、`homepage.css`、`home-shelf.js`；场景在 `storybook-3d.js` 和相关场景模块；配音在 `narrator.js`、`tts_worker.py`、`speech_rhythm.py`。
- `REFERENCE_SOURCES.json` 和 `THIRD_PARTY.md` 记录第三方来源。新增或替换素材时同步来源说明；仓库没有为这些第三方素材授予额外许可。

## 当前范围

奥托可以完整阅读；妮娅和芬恩目前仅有封面/摆件预览。界面提供中英文切换，已有正文仍为中文。账号、支付和原站完整图书库尚未实现。
