# Building from source

## What you need

| Component | Version | Notes |
|---|---|---|
| Rust | 1.77+ | MSVC toolchain (`x86_64-pc-windows-msvc`) |
| Visual Studio 2022 Build Tools | any recent | the C++ linker Tauri needs |
| Node.js | 18+ | tested on 24.x |
| WebView2 Runtime | evergreen | pre-installed on Windows 11 |
| Go | optional | only to rebuild the embedded CLI |

## The panel

```bash
npm install
npm run build              # tsc --noEmit, then Vite into dist/
npm run dev                # front end only, on :1420
```

Debug build of the executable:

```bash
cd src-tauri
cargo build
```

A debug build loads `devUrl` (`http://localhost:1420`), so run `npm run dev` in one terminal and
the built binary in another to get hot front-end reload.

Release build — this is the one file you can ship:

```bash
npx tauri build --no-bundle
# → src-tauri/target/release/seqpanel.exe   (~30 MB)
```

`--no-bundle` skips the NSIS installer; the bare exe is self-contained because the front-end
assets are embedded in it, and so is GoAlign (see below). Running `npx tauri build` without the
flag produces an installer instead.

## Tests

```bash
cd src-tauri
cargo test --release
```

Twelve tests. Seven are pure logic — help parsing, flag roles, argv construction, shell quoting,
error extraction, tool-pack loading. Five drive the real CLI end to end and are **skipped unless
`GOALIGN_BIN` points at an existing goalign executable**:

```bash
GOALIGN_BIN=tools/goalign.exe cargo test --release
```

They cover a three-command pipe, PNG bytes coming back as base64 rather than text, `stats`
consuming the alignment, positional arguments reaching `subset` and `subsites`, and a failing
command producing a readable extracted message.

The front end has no test runner of its own: `npm run build` type-checks it, and the UI is
verified by driving the running window over the Chrome DevTools Protocol — start the exe with
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` and assert against the DOM.

## How the single file stays a single file

`src-tauri/tools/goalign.exe` is committed to the repository. `.gitignore` excludes `*.exe` and
then re-includes that one path, because `src-tauri/src/bundle.rs` embeds it with
`include_bytes!` and there is no download step at run time.

On first launch the bytes are written to
`%APPDATA%\app.seq.panel\tools\goalign-<fnv1a-of-content>.exe`. The name is a fingerprint of the
content, so a new release unpacks a new file instead of overwriting one a running instance may
hold open, and a half-written file can never be mistaken for a valid tool (it is written as
`.part` and renamed).

If you delete or replace `src-tauri/tools/goalign.exe`, rebuild; the embedded copy is baked in at
compile time.

## Rebuilding the embedded CLI

GoAlign is upstream code under GPL-2.0. SeqPanel only ever starts it as a child process, which is
what keeps the two works separately licensed — see [NOTICE](../../NOTICE).

```bash
git clone https://github.com/evolbioinfo/goalign
cd goalign && git checkout v0.4.1
CGO_ENABLED=0 go build -trimpath \
  -ldflags "-s -w -X github.com/evolbioinfo/goalign/version.Version=v0.4.1" \
  -o ../SeqPanel/src-tauri/tools/goalign.exe
```

Two details matter:

- **Inject the version string.** Without `-X .../version.Version=v0.4.1`, `goalign version` prints
  nothing and the panel's status line shows an empty version.
- **Module downloads.** Where `proxy.golang.org` is unreachable, use
  `GOPROXY=https://goproxy.cn,direct`. `draw png` pulls in `gonum/plot`, which is the bulk of the
  21 MB binary.

After replacing the binary, click **Use bundled GoAlign** in the panel: the reflection cache is
keyed on file name and modification time, and `localStorage` still holds the path of the copy you
extracted before.

## Layout

```
src/                 TypeScript front end (Vite)
  main.ts            panel state, rendering, IPC calls
  controls.ts        per-command flag form builder
  i18n.ts            zh/en tables, lookup, DOM localisation
  theme.ts           light / dark / follow-system
  types.ts           shared shapes, command-tree builder, flag filtering
index.html           static skeleton with data-i18n keys
src-tauri/
  src/lib.rs         module wiring, the E#<key>|<detail> error helper
  src/schema.rs      cobra reflection: __complete walk + --help parser
  src/runner.rs      argv building, shell quoting, the OS pipe chain
  src/commands.rs    IPC commands, reflection cache
  src/bundle.rs      embedded CLI extraction
  src/toolpack.rs    per-tool curation
  src/bin/dump_schema.rs   CLI helper that prints the reflection summary
  toolpacks/goalign.json   presets and positional hints
  tools/goalign.exe        embedded binary (committed on purpose)
  capabilities/default.json  dialog + window:allow-set-theme permissions
samples/demo.fasta   a small alignment that exercises every preset
docs/en, docs/zh     the two documentation trees
LICENSES/GPL-2.0.txt GoAlign's licence text, reproduced
```

## Identifier and paths

Crate `seqpanel`, library `seq_panel`, Tauri identifier `app.seq.panel` — which is what the
`%APPDATA%` folder is named. `localStorage` keys are prefixed `seqpanel.`. Renaming the identifier
oracles the app data folder behind, so a rename is a breaking change for existing users.

Renaming the *project directory* is also disruptive in a different way: `src-tauri/target/` caches
absolute paths, so after a move `rm -rf src-tauri/target` before building again.
