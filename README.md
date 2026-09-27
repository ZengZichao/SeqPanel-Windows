# SeqPanel

A Windows graphical panel for phylogenetics command-line tools built with
[cobra](https://github.com/spf13/cobra). **GoAlign v0.4.1 is embedded** and works out of the
box; the reflection engine is generic, so pointing the panel at any other cobra CLI — GoTree
among them — turns it into a panel for that tool.

It reflects the whole command tree of whichever executable you point it at, turns every
command into a form with validated fields, chains commands with real OS pipes, and shows
the exact shell line it produced. Nothing is hidden behind the GUI: every workflow you
build can be copied out and run in a terminal unchanged.

**English** · [简体中文](README.zh-CN.md) · [Detailed documentation](docs/en/README.md)

---

## Why this exists

Alignment CLIs are powerful and hard to drive by hand. GoAlign alone exposes 76 runnable
commands spread over 42 top-level groups, and most of them take a flag you have to remember
is spelled `--align` rather than `--input`, plus a format switch that has to match the file
you actually have. Chaining them means knowing which commands hand the alignment on and
which ones consume it, and how to quote a path that contains a space.

SeqPanel keeps the CLI as the single source of truth — it never re-implements a command —
and removes the typing burden instead:

- **No installation ceremony.** GoAlign is embedded in the executable. The download is one
  `.exe`, and it unpacks the tool on first launch.
- **The GUI is generated, not hand-written.** Flags, types and defaults come from
  `<tool> --help`, so an upgraded CLI needs no change in the panel.
- **The shell line is always visible**, so you can learn the CLI from the GUI and leave the
  GUI behind later.

## Features

| | |
|---|---|
| Interface language | 中文 / English, switched at runtime, remembered between launches |
| Colour theme | Light / Dark / Follow system, including the native title bar |
| Command coverage | Every executable command of the target CLI, grouped as a collapsible tree |
| Search | Filter the tree by command id or description |
| Pipelines | Stack commands in order; stdout of step *n* feeds stdin of step *n+1* |
| Presets | One-click multi-step workflows shipped per tool |
| Flag forms | Typed inputs, file pickers for path-like flags, choice menus for enumerated flags |
| Results | Alignment tables, distance matrices and PNG drawings rendered inline |
| Export | Save output to `.fasta` / `.phy` / `.nx` / `.png` / `.txt`, or copy the command line |
| Works with other CLIs | Point it at any cobra binary and it becomes a panel for that binary (reflection only — curated presets exist for GoAlign today) |

## What actually ships

| Tool | Embedded in the exe | Presets + positional hints |
|---|---|---|
| **GoAlign v0.4.1** | Yes — unpacked on first launch | Yes, curated in `src-tauri/toolpacks/goalign.json` |
| **GoTree** | No — supply your own `gotree.exe` | Yes, the same reflection path; no GoTree presets in this repo |
| Any other cobra CLI | No | Not unless you add a tool pack |

Reflection itself is generic: every command, flag, type and default shows up regardless of
tool. What a *tool pack* adds is the layer `--help` cannot express — preset workflows, and the
bare positional arguments that some commands require. Five GoAlign commands read positional
arguments (`append`, `concat`, `revcomp`, `subset`, `subsites`) and cobra never says so in the
usage line, which is exactly the gap the pack closes. See
[Command coverage](docs/en/command-reference.md).

## Quick start

1. Download the `SeqPanel-<version>-win-x64.exe` asset from the
   [latest release](https://github.com/ZengZichao/SeqPanel-Windows/releases/latest) —
   one self-contained file, no installer.
2. Run it. The status line should report
   `GoAlign  ·  v0.4.1  ·  76 runnable commands / 42 top-level groups`.
3. In **Input**, either paste a FASTA alignment or type/pick an alignment file path.
   `samples/demo.fasta` is included and is built to make every preset do something visible.
4. Click a command in **Commands** on the left — it lands in **Workflow**.
5. Press **Run**. The table or drawing appears in **Result**; **Equivalent command line**
   shows what was executed.

To try a pipeline immediately, press one of the preset workflow buttons in the header.

**Requirements:** Windows 10 or 11 and the [WebView2 Runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/)
(pre-installed on Windows 11; may need installing on older Windows 10). No Python, no .NET,
no Go, no Node.js.

## Language and theme

Both controls sit at the right end of the header.

- **Language / 语言** swaps the whole interface between Chinese and English instantly and
  stores the choice. With no stored choice it follows the system language.
- **Theme / 主题** offers *Follow system*, *Light* and *Dark*. The selection also recolors
  the Windows title bar, and *Follow system* tracks live changes to the OS setting.

Command names and flag help stay in English by design: they are read from the upstream
tool's own `--help` output rather than from SeqPanel. Preset workflow names and the
positional-argument hints do have Chinese text, because those are curated by SeqPanel.
See [Language and theme](docs/en/language-and-theme.md).

## How it works

SeqPanel is a Tauri v2 application: a Rust backend that owns the processes and a
WebView2 window that renders a TypeScript front end.

It never links against or imports upstream code. Each step is a separate child process,
and the only traffic between them is stdout → stdin, exactly as if you had typed
`goalign clean seqs | goalign clean sites | goalign stats` yourself. Child processes are
launched with `CREATE_NO_WINDOW`, so no console flashes on screen.

Flags that merely restate the CLI's own default are dropped before the process starts,
which keeps the produced command line short and the results identical to hand typing.

```
  ┌──────────────┐   spawn    ┌──────────┐   pipe   ┌──────────┐
  │   SeqPanel   │ ─────────► │ goalign  │ ───────► │ goalign  │
  │  (Rust+UI)   │  argv only │  clean   │  stdout  │  stats   │
  └──────────────┘            └──────────┘          └──────────┘
```

## Documentation

| Page | Contents |
|---|---|
| [Getting started](docs/en/getting-started.md) | First launch, the two ways to supply an alignment, a worked example |
| [Interface tour](docs/en/interface.md) | Every region, control and status message explained |
| [Workflows and pipelines](docs/en/workflows.md) | Multi-step chains, presets, flag rules, positional arguments |
| [Language and theme](docs/en/language-and-theme.md) | What is translated, what is not, where the choice is stored |
| [Command coverage](docs/en/command-reference.md) | How the tree is reflected, GoAlign command groups, writing a tool pack for another CLI |
| [Building from source](docs/en/building-from-source.md) | Toolchain, dev loop, release build, running tests |
| [Troubleshooting](docs/en/troubleshooting.md) | Common failures and how to read them |

Chinese versions live in [`docs/zh/`](docs/zh/README.md).

## Interface preview

| English / Light | 中文 / 深色 |
|---|---|
| ![English light interface](docs/images/interface-en-light.png) | ![Chinese dark interface](docs/images/interface-zh-dark.png) |

## Building from source

```bash
npm install
npm run build
npx tauri build --no-bundle
# → src-tauri/target/release/seqpanel.exe
```

You need a Rust toolchain with the MSVC allocator, the Visual Studio 2022 Build Tools, Node
18+, and the WebView2 Runtime. The full walkthrough, including how the embedded GoAlign
binary is produced, is in [Building from source](docs/en/building-from-source.md).

## Repository layout

```
src/                 TypeScript front end
  i18n.ts            zh/en message tables, lookup and DOM localisation
  theme.ts           light / dark / follow-system resolution
  main.ts            panel state, rendering, IPC calls
  controls.ts        per-command flag form builder
  types.ts           shared shapes and the command-tree builder
index.html           static skeleton, marked up with data-i18n keys
src-tauri/
  src/               Rust: reflection, runner, bundling, IPC commands
  toolpacks/         per-tool curation (display name, presets, positional hints)
  tools/goalign.exe  embedded CLI, unpacked on first launch
docs/en, docs/zh     detailed usage documentation, one language per tree
samples/demo.fasta   an eight-sequence nucleotide alignment for trying things out
```

## Licence

SeqPanel's own source is licensed under the [Apache License 2.0](LICENSE); see also
[NOTICE](NOTICE).

```
Copyright 2026 ZengZichao

Licensed under the Apache License, Version 2.0. See LICENSE for the full text.
```

SeqPanel is a separate program that starts [GoAlign](https://github.com/evolbioinfo/goalign)
as a child process and talks to it over pipes — and likewise for any other cobra CLI you
supply yourself, such as [GoTree](https://github.com/choishingwan/GoTree). It never links
against or imports their code, so the two stay independently licensed works. Both upstream
tools are GNU GPL v2, and their licence text and copyright remain theirs; the full GPL-2.0
text is reproduced at [LICENSES/GPL-2.0.txt](LICENSES/GPL-2.0.txt). No copy of GoTree is
included in this repository or in the released executable.

The embedded `src-tauri/tools/goalign.exe` is an unmodified build of GoAlign v0.4.1 — only
the linker-injected version string is set, exactly as upstream's own Makefile does. Its
corresponding source is the upstream repository at that tag, and no restriction beyond the
GPL v2 is placed on it by this project.

## Credits

The command-line tools this panel drives are written by [Frédéric Lemoine](https://github.com/fredericlemoine)
and the [evolbioinfo](https://github.com/evolbioinfo) contributors.
