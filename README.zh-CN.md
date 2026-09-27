# SeqPanel

面向 [cobra](https://github.com/spf13/cobra) 构建的进化生物学命令行工具的 Windows 图形操作面板。
**内置 GoAlign v0.4.1**，下载即用；反射引擎本身是通用的，把它指向任意其他 cobra 程序（包括
GoTree），它就变成那个程序的面板。

它会把自己指向的可执行文件的整棵命令树反射出来，把每条命令变成一张带类型校验的表单，
用真实的操作系统管道把多条命令串起来，并原样显示它生成的命令行。GUI 背后没有任何黑箱：
你在面板里搭出来的每一步都能复制出去，直接在终端里跑。

**[English](README.md)** · 简体中文 · [完整文档](docs/zh/README.md)

---

## 为什么要做这个

比对类命令行工具很强，但手工驱动很费劲。仅 GoAlign 就有 76 个可执行命令、分属 42 个顶层
命令组，而且多数命令的输入开关拼写是 `--align` 而不是 `--input`，格式开关还必须和你手上那份
文件真正格式对上。串链条意味着要记住哪些命令会把比对继续传下去、哪些会把比对消费掉，还要
给带空格的路径加引号。

SeqPanel 始终把 CLI 当作唯一事实来源——它从不重新实现任何一条命令——它去掉的是打字负担：

- **没有安装仪式。** GoAlign 编译进了可执行文件。下载就是一个 `.exe`，首次启动自动解出工具。
- **界面是生成的，不是手写的。** 开关、类型、默认值全部来自 `<tool> --help`，上游升级后
  面板不需要跟着改代码。
- **等价命令行始终可见**，所以你可以一边用图形界面一边学会 CLI，之后随时把界面扔掉。

## 功能

| | |
|---|---|
| 界面语言 | 中文 / English，运行时切换，重启后仍然记得 |
| 配色主题 | 浅色 / 深色 / 跟随系统，原生标题栏一起变 |
| 命令覆盖 | 目标 CLI 的全部可执行命令，按可折叠的命令树分组 |
| 搜索 | 按命令名或说明过滤命令树 |
| 流水线 | 按顺序叠加命令；第 *n* 步的 stdout 直接喂给第 *n+1* 步的 stdin |
| 预设 | 一键载入为工具人工整理的多步工作流 |
| 参数表单 | 带类型的输入框、路径类开关的文件选择器、枚举开关的下拉菜单 |
| 结果 | 比对表格、距离矩阵、PNG 绘图直接内嵌显示 |
| 导出 | 另存为 `.fasta` / `.phy` / `.nx` / `.png` / `.txt`，或复制等价命令行 |
| 驱动其他 CLI | 指向任意 cobra 二进制，它就变成那个二进制的面板（仅反射；目前只有 GoAlign 有预设） |

## 实际发布内容

| 工具 | 是否内置进 exe | 预设 + 位置参数标注 |
|---|---|---|
| **GoAlign v0.4.1** | 是——首次启动解出 | 是，整理在 `src-tauri/toolpacks/goalign.json` |
| **GoTree** | 否——自备 `gotree.exe` | 走同一套反射路径；本仓库不含 GoTree 预设 |
| 其他 cobra CLI | 否 | 除非你自己写一个工具包 |

反射本身是通用的：不论指向哪个工具，命令、开关、类型、默认值都会照常出现。*工具包*补的是
`--help` 表达不了的那一层——预设工作流，以及某些命令要求的位置参数。GoAlign 里有 5 个命令读
位置参数（`append`、`concat`、`revcomp`、`subset`、`subsites`），而 cobra 从不在 Usage 行里说明
这一点，这正是工具包要补的缺口。详见[命令覆盖](docs/zh/command-reference.md)。

## 快速上手

1. 从 [最新 Release](https://github.com/ZengZichao/SeqPanel-Windows/releases/latest) 下载
   `SeqPanel-<version>-win-x64.exe`——单文件自包含，没有安装程序。
2. 直接运行。状态栏应该显示
   `GoAlign  ·  v0.4.1  ·  76 个可执行命令 / 42 个顶层命令族`。
3. 在**输入**区粘贴一段 FASTA 比对，或者填/选一个比对文件路径。仓库带了
   `samples/demo.fasta`，它的数据是特意造的，保证每个预设都有肉眼可见的效果。
4. 在左侧**命令表**点一条命令——它会进入**工作流**。
5. 点**运行**。表格或图会出现在**结果**区，**等价命令行**显示实际执行了什么。

想立刻体验流水线，直接点顶栏里的预设工作流按钮。

**运行要求：** Windows 10 或 11，以及 [WebView2 Runtime](https://learn.microsoft.com/zh-cn/microsoft-edge/webview2/)
（Win11 自带；较老的 Win10 可能需要自行安装）。不需要 Python、.NET、Go、Node.js。

## 语言与主题

两个下拉都在顶栏右端。

- **语言**即时在中英文之间切换整个界面并记住选择；没有历史选择时跟随系统语言。
- **主题**提供*跟随系统*、*浅色*、*深色*。选择会同时改变 Windows 标题栏颜色，*跟随系统*
  还会实时响应系统设置的改动。

命令名和开关说明按设计保持英文：它们来自上游工具自己的 `--help`，不是 SeqPanel 写的。
预设工作流的名字和位置参数的提示语有中文，因为那部分是 SeqPanel 人工整理的。
见[语言与主题](docs/zh/language-and-theme.md)。

## 工作原理

SeqPanel 是一个 Tauri v2 应用：Rust 后端负责进程，WebView2 窗口渲染 TypeScript 前端。

它从不链接或 import 上游代码。每一步都是独立的子进程，进程之间只有 stdout → stdin，
和你自己在终端里敲 `goalign clean seqs | goalign clean sites | goalign stats` 完全等价。
子进程用 `CREATE_NO_WINDOW` 启动，所以不会闪出控制台窗口。

只是复述 CLI 默认值的开关在进程启动前就被丢掉，因此生成的命令行足够短，结果和手敲一致。

```
  ┌──────────────┐   spawn    ┌──────────┐   pipe   ┌──────────┐
  │   SeqPanel   │ ─────────► │ goalign  │ ───────► │ goalign  │
  │  (Rust+UI)   │  argv only │  clean   │  stdout  │  stats   │
  └──────────────┘            └──────────┘          └──────────┘
```

## 文档

| 页面 | 内容 |
|---|---|
| [快速上手](docs/zh/getting-started.md) | 首次启动、两种提供比对的方式、一个完整例子 |
| [界面导览](docs/zh/interface.md) | 逐个区域、控件与状态提示的解释 |
| [工作流与流水线](docs/zh/workflows.md) | 多步链条、预设、开关规则、位置参数 |
| [语言与主题](docs/zh/language-and-theme.md) | 什么会翻译、什么不会、选择存在哪里 |
| [命令覆盖](docs/zh/command-reference.md) | 命令树如何反射、GoAlign 命令分组、为其他 CLI 写工具包 |
| [从源码构建](docs/zh/building-from-source.md) | 工具链、开发循环、发布构建、跑测试 |
| [故障排查](docs/zh/troubleshooting.md) | 常见失败与怎么读懂它们 |

English versions live in [`docs/en/`](docs/en/README.md).

## 界面预览

| English / 浅色 | 中文 / 深色 |
|---|---|
| ![英文浅色界面](docs/images/interface-en-light.png) | ![中文深色界面](docs/images/interface-zh-dark.png) |

## 从源码构建

```bash
npm install
npm run build
npx tauri build --no-bundle
# → src-tauri/target/release/seqpanel.exe
```

需要带 MSVC 分配器的 Rust 工具链、Visual Studio 2022 Build Tools、Node 18+，以及 WebView2
Runtime。完整流程——包括内置的 GoAlign 二进制是怎么编出来的——在
[从源码构建](docs/zh/building-from-source.md)。

## 仓库结构

```
src/                 TypeScript 前端
  i18n.ts            中英文案表、查找与 DOM 本地化
  theme.ts           浅色 / 深色 / 跟随系统的判定
  main.ts            面板状态、渲染、IPC 调用
  controls.ts        逐命令的参数表单构建器
  types.ts           共享数据结构与命令树构建
index.html           静态骨架，用 data-i18n 键标注
src-tauri/
  src/               Rust：反射、执行器、内置工具解出、IPC 命令
  toolpacks/         按工具人工整理的内容（显示名、预设、位置参数标注）
  tools/goalign.exe  内置命令行工具，首次启动解出
docs/en, docs/zh     详细使用文档，一棵语言一个目录
samples/demo.fasta   八条序列的核酸比对，用来试功能
```

## 许可证

SeqPanel 自身源码采用 [Apache License 2.0](LICENSE)；另见 [NOTICE](NOTICE)。

```
Copyright 2026 ZengZichao

Licensed under the Apache License, Version 2.0. See LICENSE for the full text.
```

SeqPanel 是一个独立程序，它把 [GoAlign](https://github.com/evolbioinfo/goalign) 作为子进程启动，
通过管道与之通信——对你自己提供的任何其他 cobra 程序也一样，例如
[GoTree](https://github.com/choishingwan/GoTree)。它从不链接或 import 上游代码，因此两者保持为
相互独立、各自许可的作品。两个上游工具都是 GNU GPL v2，其许可文本与版权归上游所有；GPL-2.0
全文收录在 [LICENSES/GPL-2.0.txt](LICENSES/GPL-2.0.txt)。本仓库与发布出的可执行文件里都不包含
GoTree 的任何副本。

内置的 `src-tauri/tools/goalign.exe` 是 GoAlign v0.4.1 的未修改构建——只按上游自己的 Makefile 的
做法注入了版本字符串。与该二进制对应的源码就是上游仓库的对应 tag，本项目不在 GPL v2 之外对它
施加任何额外限制。

## 致谢

本面板所驱动的这些命令行工具由 [Frédéric Lemoine](https://github.com/fredericlemoine) 与
[evolbioinfo](https://github.com/evolbioinfo) 的贡献者们编写。
