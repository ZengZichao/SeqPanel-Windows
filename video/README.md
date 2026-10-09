# SeqPanel 产品宣传视频 · 60s

面向 SeqPanel 的 60 秒产品宣发片，参考互联网大厂工具类产品的发布片节奏制作
（痛点钩子 → 产品揭示 → 三段实机能力演示 → 特性快切 → 尾板）。

## 成片

| 项 | 值 |
|---|---|
| 在线播放 / 下载 | [`SeqPanel-promo-60s.mp4`](https://github.com/ZengZichao/SeqPanel-Windows/releases/download/v0.1.0/SeqPanel-promo-60s.mp4)（Release v0.1.0 附件） |
| 本地母版 | `output/SeqPanel-产品宣传视频-60s.mp4`（渲染产物，不入 git 历史；Release 附件因文件名需 ASCII 而改名） |
| 时长 | 60.000 s（1800 帧 @30fps） |
| 分辨率 / 帧率 | 1920 × 1080 · 30 fps（逐帧渲染，非录屏、非插帧） |
| 视频编码 | H.264 High · yuv420p(tv, bt709) · CRF 17 · preset slow · 3807 kb/s |
| 音频编码 | AAC-LC · 48 kHz · 立体声 · 192 kb/s |
| 响度 | −16.9 LUFS（集成）· LRA 5.8 LU · 真峰值 −6.7 dBFS |
| 声音设计 | 全片无采样、无宽带噪声铺底：riser / 转场 / 镲 / 军鼓 / 点击均为谐波合成 |
| 质检门 | `blackdetect` 0 段 · `freezedetect(0.8s)` 0 段 · `silencedetect(-40dB,0.6s)` 0 段 · 全解码 0 错误 |
| 字幕 | 全部为画面内烧录字幕（中英双行），不另附字幕文件 |
| 海报 | `output/poster.jpg`（取 14.0 s 字标帧） |

## 目录

```
video/
├── 分镜脚本.md            逐镜文案、时长、动效、声音设计与质检修复清单
├── README.md              本文件
├── MANIFEST.txt           交付清单与成片参数
├── scene/                 视频合成器（决定每一帧长什么样）
│   ├── index.html         1920×1080 画布宿主
│   ├── anim.js            缓动 / 渐变 / 字体 / 颗粒 / 光扫等通用绘制原语
│   ├── app-ui.js          SeqPanel 界面 mock（三列布局、命令树、表单、工作流、结果）
│   ├── main.js            S1–S8 主时间轴，window.SEEK(t) 按秒渲染
│   └── assets/            真实界面截图（浅色 / 深色）
├── audio/
│   └── synth_audio.py     程序化配乐 + 音效，输出 mix.wav
├── build/
│   ├── render-frames.mjs  无头 Edge 逐帧截图（DRY=1 只做全时间轴报错扫描）
│   └── encode.mjs         ffmpeg 合成 MP4 + 海报
└── output/
    └── poster.jpg         海报帧（README 缩略图，入 git）
```

`output/*.mp4`、`audio/mix.wav`、`build/frames|qa|logs/` 是渲染产物，已在 `video/.gitignore` 里排除：
体积大且可确定性复现。MP4 以 Release 附件的形式发布，不写进 git 历史。

## 重新渲染

需要 Node.js 18+、Python 3 + numpy + scipy、一个 Chromium 内核浏览器（Edge 或 Chrome），
以及 ffmpeg / ffprobe。脚本默认从同级目录 `../视频制作流程/` 取依赖；换机器时用环境变量指过去即可：

```bash
export VIDEO_TOOLCHAIN=/path/with/node_modules   # 需含 @ffmpeg-installer/win32-x64 等
cd SeqPanel/video/build

# 1) 全时间轴语法/绘制扫描（不出图，约 70s）
DRY=1 node render-frames.mjs 0 1799

# 2) 逐帧出图（1800 帧，约 4–6 分钟；已存在的帧会跳过）
node render-frames.mjs 0 1799

# 3) 音轨
python ../audio/synth_audio.py

# 4) 合成
node encode.mjs            # → ../output/SeqPanel-产品宣传视频-60s.mp4
```

> 依赖装法：`npm i @ffmpeg-installer/win32-x64 @ffprobe-installer/win32-x64 puppeteer-core`。
> 别用 `ffmpeg-static`——它的 postinstall 从 GitHub Releases 拉二进制，国内网络常超时；
> 上面两个 installer 把二进制直接打进 npm 包里。它们没有 JS 入口，只能按路径引用 exe。

改动画只需编辑 `scene/*.js` 后用 `node render-frames.mjs <起帧> <止帧>` 局部重渲染，再跑一次 `encode.mjs`。
场景边界（秒）：S1 0–6 · S2 6–11 · S3 11–16 · S4 16–27 · S5 27–38 · S6 38–46 · S7 46–54 · S8 54–60。

## 内容依据

片中所有能力描述均取自产品自身材料，未虚构功能：

- 命令数量、命令组数量、版本号：`README.zh-CN.md` 与状态栏文案（76 个可执行命令 / 42 个顶层命令组 / GoAlign v0.4.1）；
- 三列布局、控件名称、状态栏三种状态、等价命令行与复制行为：`docs/zh/interface.md`；
- 流水线为真实操作系统管道、中间结果不落盘、位置参数与预设：`docs/zh/workflows.md`；
- 语言与主题行为：`docs/zh/language-and-theme.md`；
- 特性卡中的真实界面截图：`docs/images/interface-en-light.png`、`docs/images/interface-zh-dark.png`；
- 结果区统计表数值取自真实界面截图；`draw png` 的内嵌图形为按 `samples/demo.fasta`
  的 8 条序列、60 个位点绘制的比对热图（一行一条序列、一个位点一个像素），
  与产品文档对该命令的输出描述一致。

视频为程序化绘制，不含任何未验证的产品承诺。
