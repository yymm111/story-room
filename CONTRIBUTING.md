# 一起开发 Story Room

## 启动

1. 安装 Python 3；检查 JavaScript 语法还需要 Node.js。
2. 克隆仓库并进入目录：

```sh
git clone https://github.com/yymm111/story-room.git
cd story-room
python3 server.py --port 8766
```

浏览器访问 http://127.0.0.1:8766/ 。前端依赖已放在 `vendor/`，无需安装 npm 依赖或执行打包。内置 68 页配音可直接播放。

新增文字的 AI 配音为可选能力，需要 Apple 芯片 Mac、ffmpeg，以及通过 `python3 setup_ai_voice.py` 安装的本机语音环境。模型、环境、缓存和浏览器阅读数据不在仓库中。图片文字识别依赖 macOS Vision 和本机 Swift 编译器；不可用时仍可手动填写正文。

## 本地调试与上线

当前阶段先本地修改和验证，待用户明确同意后再上线。`main` 分支连接了 GitHub Pages 自动发布，因此未获得明确上线指令时，不推送到 `main`，也不主动触发线上部署。本地预览使用 `python3 server.py --port 8766`。

## 修改和提交

- 从 `main` 创建个人功能分支，在自己的分支提交，通过 Pull Request 合并。
- 改动前先同步 `main`。不要直接覆盖其他人的提交。
- 提交前执行 `npm run check`；修改 Python 时检查相关文件语法。根据影响范围在浏览器确认：首页选书、阅读返回、配音等。
- `.local/` 只存机器状态，不要提交模型、环境、缓存、账号信息或密钥。
- 书籍正文与元数据在 `stories.js`、`otto-book.js`、`prince-book.js`、`carmela-book.js`；卡梅拉纸艺场景在 `carmela-paper.js`，书架摆件与导出接口在 `carmela-scene.js`；妮娅和芬恩数据在 `companion-books.js`，运行时场景在 `reference-companion-scenes.js`，资源和动作适配在 `companion-assets.js`、`companion-choreography.js`；首页在 `app.js`、`homepage.css`、`home-shelf.js`；场景在 `storybook-3d.js` 和相关场景模块；配音在 `narrator.js`、`tts_worker.py`、`speech_rhythm.py`。
- `REFERENCE_SOURCES.json` 和 `THIRD_PARTY.md` 记录第三方来源。新增或替换素材时同步来源说明；仓库没有为这些第三方素材授予额外许可。

## 当前范围

奥托、卡梅拉、妮娅和芬恩均可完整阅读；妮娅和芬恩各 10 页，支持本机 AI 配音与系统朗读。界面提供中英文切换，已有正文仍为中文。账号、支付和原站完整图书库尚未实现。
