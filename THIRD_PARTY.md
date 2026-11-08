# Third-party components

All runtime files are served from this local folder. There are no CDN dependencies.

| Component | Version | Purpose | License |
| --- | --- | --- | --- |
| Mozilla PDF.js / pdfjs-dist | 6.5.438 | PDF rendering and text extraction | Apache-2.0; see vendor/pdfjs-dist/LICENSE and per-directory font notices |
| JSZip | 3.10.2 | EPUB archive parsing | MIT option; see vendor/jszip/LICENSE.markdown |

Source packages were obtained from the official npm registry. Upstream projects:

- https://github.com/mozilla/pdf.js
- https://github.com/Stuk/jszip

The project uses StoryComet reference code and visual/audio assets as documented in the sections below and in REFERENCE_SOURCES.json. Those assets are not original to this project, and their redistribution license has not been confirmed. The original local demonstration stories, Chinese retellings, generated narration and independently created illustrations are distinguished below. This source repository does not grant an additional license to third-party material.

Apple Vision, ImageIO and the operating system's speech voices are system components and are not redistributed.

## Local speech preview

The Serena demonstration was generated locally with the Qwen3-TTS-12Hz-1.7B-CustomVoice model, converted to MLX 4-bit by mlx-community (Apache-2.0). Runtime used MLX Audio 0.6.4 (MIT) and MLX 0.32.4. Model weights and the private local runtime environment are excluded from the distributable archive. The preview speaks this project’s own original Chinese story; no reference voice recording or voice cloning was used.

Model: https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-4bit

The 32-second looping bedtime score in assets/audio/bedtime-garden.mp3 is an original composition synthesized locally for this project, with no third-party recording samples.

## 3D reading edition

Three.js 0.187.0 (MIT), obtained from the official npm package; license at vendor/three/LICENSE. The room geometry, physical book, paper stage, and Canvas textures were authored for this local application. The animated fox has separate credits below.

《小王子 · 星空旅程》 is a new Chinese children's abridgment based on the plot of Antoine de Saint-Exupéry's The Little Prince. It does not reproduce a modern Chinese translation. The cover and watercolor paper artwork were created for this project; the animated fox is a credited third-party asset.

The 30 built-in page narrations were generated locally using Qwen3-TTS CustomVoice / Serena. Model weights and the local MLX runtime remain excluded from the distribution archive. For newly imported books, tts_engine.py routes synthesis to the same local worker rather than the operating system speech engine.


The Little Prince paper-theatre artwork in assets/prince-art/ was created for this project with the built-in imagegen tool. The atlas prompts and filenames are documented in assets/prince-art/ART_NOTES.md. These assets are independent of the reference site.

## V4 reading room

- Fox model: PixelMannen, CC0. Rigging and animation: tomkranis, CC BY 4.0. Conversion to glTF: @AsoboStudio and @scurest, CC BY 4.0. Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox . Model, attribution and license are included in `assets/models/`. This app derives a smoother surface with two Loop subdivision levels, interpolates skin weights while retaining the UV seams, adds eye/nose/ear meshes, uses a new fur material, scales the head, and adds blink and pointer-response overlays to the original Survey animation. These are local runtime modifications; the source GLB is retained unchanged.
- Fredoka (600) and Baloo 2 (800): Google Fonts, SIL Open Font License 1.1. License notices: `assets/fonts/Fredoka-OFL.txt` and `assets/fonts/Baloo-OFL.txt`.
- Wood, paper, cloth and carved-button artwork in `assets/room/` was generated for this project with imagegen; prompts are in `assets/room/ART_NOTES.md`.
- The local GLTFLoader, SkeletonUtils and BufferGeometryUtils addons use the same Three.js MIT license in `vendor/three/LICENSE`.

## StoryComet Otto 免费书视觉素材

`assets/otto-reference/` 下插画、模型和动作来自用户指定的 StoryComet 免费书公开素材。用于本次对照制作及源码协作；未确认再分发许可，不属于本项目原创素材。精确来源见 `REFERENCE_SOURCES.json`。本地配音独立使用 Qwen3-TTS 生成。

## 1.1 书房与角色对照升级

`assets/room-reference/` 的六个玩具模型、木纹、纸张、墙面法线和按钮图像，以及 `assets/otto-reference/cover.webp`，来自用户指定原站的公开资源。`reference-hero.js` 改编公开的角色姿态、视线、眨眼和手部 IK 实现。精确文件来源见 `REFERENCE_SOURCES.json`；用途与上述 Otto 素材相同。

`otto-smooth.bin.gz` 是本地基于原 Otto 模型进行一次 Loop 细分、插值骨骼权重并保留 UV 接缝的派生几何，生成脚本保存在本机 `.local/refine-otto.mjs`；原始 GLB 未改动。鼠标粒子、页面星星编排和本地 TTS 为本地实现。后处理插件 EffectComposer、RenderPass、UnrealBloomPass、OutputPass 及依赖来自同一官方 Three.js 0.187.0 npm 包，沿用 `vendor/three/LICENSE`。

## 1.2 主页书架

主页双层木架、实体书、书签和摆件动画适配 StoryComet 公开的 `src/shelf.js`、`src/bookmark.js` 及 `src/props.js` 中的书架工具函数。`assets/shelf-reference/` 包含原版前三本免费书的封面、标题图、书签、品牌图、墙纸及七个新增摆件模型；猫头鹰和月亮复用已有原站模型。每个文件的原始网址和摘要见 `REFERENCE_SOURCES.json`。用于本次对照制作及源码协作，现随源码公开，具体权利信息以各来源为准。

## 1.2.1 主页音效与鼠标

`reference-soundkit.js` 适配原站公开的 `src/audio.js`，仅调用互动音效，不启用其中的音乐或语音。`assets/audio/shelf/` 的九个原版音效对应前三本书的九个摆件，来源与摘要均记录在 `REFERENCE_SOURCES.json`。正文仍使用本机 TTS。

`reference-sparkles.js` 适配原站公开的 `src/sparkles.js`，保留 GPU 星形着色、金粉/粉色/蓝色闪烁、光晕和漂移；点击粒子调整为更宽的散开范围与较小尺寸。鼠标拖尾用独立透明画布渲染，保持与场景动画分离。新增手势解锁、音效独立开关与音量、悬停冷却、同一摆件替换旧声音、最多三路摆件声音、减少动态效果与页面隐藏时清理。用于本地对照及源码协作，现随源码公开，具体权利信息以各来源为准。

## 1.3 奥托绘本打磨

`reference-otto-spreads.js` 适配原站公开的 `books/otto-shy-moon/scenes.js`；`reference-diorama.js` 适配 `src/scenes.js` 的纸艺场景与卡片工具；`reference-scene-props.js` 仅保留 `src/props.js` 中该书使用的气球、星星、纸片和粒子工具。适配包括本地书本坐标、灯光强度、透明区域拾取、起飞/星星进度以及本地中文配音的动作衔接。`town-strip.webp` 为原站公开的水彩城镇前景，来源与摘要见 `REFERENCE_SOURCES.json`。

奥托保留既有细分模型、UV 及骨骼，材质响应由本地 `otto-material.js` 处理。中文正文及本机 Serena 配音未替换为原站内容。全部仍用于本地对照及源码协作，现随源码公开，具体权利信息以各来源为准。


## 1.4 卡梅拉原创冒险

《不一样的卡梅拉》/ Les P’tites Poules 的人物、系列身份归原权利人所有，文字作者 Christian Jolibois、绘者 Christian Heinrich。本站《卡梅拉的新冒险：风铃山的秘密》是独立编写的冒险故事，不是原作任何一册的复刻、翻译或官方续作。未下载或复制原书插画、正文、扫描页、有声书录音；不表示获得出版社或作者背书。

`assets/carmela-art/cover.jpg`、`scenes.jpg`、`puppet-rig-v1.png` 和 `paper-scenery-v1.png` 使用内置图像生成工具独立生成；提示词、部件布局与排版说明随目录保存。`carmela-scene.js` 的书架摆件、墙纸，以及 `carmela-paper.js` 的纸艺部件组合、桥板、绳结和八页动作编排为本项目新建。8 页中文配音在本机使用 Qwen3-TTS/Serena 生成。资料依据见 `content/research/carmela-sources.md`。
