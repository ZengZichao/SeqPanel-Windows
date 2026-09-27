# 从源码构建

## 需要准备什么

| 组件 | 版本 | 说明 |
|---|---|---|
| Rust | 1.77+ | MSVC 工具链（`x86_64-pc-windows-msvc`） |
| Visual Studio 2022 Build Tools | 较新版本即可 | Tauri 需要的 C++ 链接器 |
| Node.js | 18+ | 实测跑在 24.x |
| WebView2 Runtime | 常青版 | Windows 11 自带 |
| Go | 可选 | 只有要重编内置 CLI 时才需要 |

## 构建面板

```bash
npm install
npm run build              # 先 tsc --noEmit，再由 Vite 产出 dist/
npm run dev                # 只起前端，端口 :1420
```

调试版可执行文件：

```bash
cd src-tauri
cargo build
```

调试构建读的是 `devUrl`（`http://localhost:1420`），所以想要前端热更新，就在一个终端里跑
`npm run dev`，在另一个终端里启动构建出来的二进制。

发布构建——这才是可以分发的单个文件：

```bash
npx tauri build --no-bundle
# → src-tauri/target/release/seqpanel.exe   （约 30 MB）
```

`--no-bundle` 跳过 NSIS 安装包；裸 exe 本身就是自包含的，因为前端资源编译时嵌了进去，GoAlign 也
是（见下）。不加这个参数得到的是安装包。

## 测试

```bash
cd src-tauri
cargo test --release
```

共 12 项。7 项是纯逻辑——help 解析、开关语义角色、argv 构造、shell 引用、错误抽取、工具包加载；
另外 5 项要驱动真实 CLI，**只有当 `GOALIGN_BIN` 指向一个存在的 goalign 可执行文件时才跑**，否则
按跳过处理：

```bash
GOALIGN_BIN=tools/goalign.exe cargo test --release
```

它们覆盖：三命令管道、PNG 字节以 base64 而不是文本返回、`stats` 会消费掉比对、位置参数确实到达
`subset` 与 `subsites`，以及失败命令能给出抽取后的可读提示。

前端没有自己的测试运行器：`npm run build` 负责类型检查，界面则通过 Chrome DevTools Protocol 驱动
真实窗口来验证——启动 exe 前设 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`，
再对 DOM 做断言。

## 单文件是怎么保持单文件的

`src-tauri/tools/goalign.exe` 是入库的。`.gitignore` 先排除 `*.exe`，再为这一个路径开了例外，因为
`src-tauri/src/bundle.rs` 用 `include_bytes!` 把它嵌进二进制，运行期不存在任何下载步骤。

首次启动时这些字节被写到
`%APPDATA%\app.seq.panel\tools\goalign-<内容的 fnv1a 指纹>.exe`。文件名取内容指纹，因此新版本解出
的是另一个文件，不会去覆盖可能仍被运行中实例占用的旧文件；写一半的半成品也不可能被误认成有效工具
（先写 `.part` 再 rename）。

删掉或替换 `src-tauri/tools/goalign.exe` 之后必须重新编译：内嵌的那份是编译期烘进去的。

## 重编内置的 CLI

GoAlign 是上游代码，GPL-2.0。SeqPanel 只以子进程方式启动它，这正是两者许可能够分立的原因——见
[NOTICE](../../NOTICE)。

```bash
git clone https://github.com/evolbioinfo/goalign
cd goalign && git checkout v0.4.1
CGO_ENABLED=0 go build -trimpath \
  -ldflags "-s -w -X github.com/evolbioinfo/goalign/version.Version=v0.4.1" \
  -o ../SeqPanel/src-tauri/tools/goalign.exe
```

两个细节必须注意：

- **要注入版本字符串。** 不加 `-X .../version.Version=v0.4.1` 时 `goalign version` 输出为空，面板
  状态栏的版本字段也就一直是空的。
- **模块下载。** `proxy.golang.org` 连不通的地方用 `GOPROXY=https://goproxy.cn,direct`。
  `draw png` 会拉 `gonum/plot`，它是那 21 MB 体积的主要来源。

替换二进制之后，在面板里点一次**用内置 GoAlign**：反射缓存按文件名 + 修改时间生效，而
`localStorage` 里存的还是上一次解出来的那个路径。

## 目录结构

```
src/                 TypeScript 前端（Vite）
  main.ts            面板状态、渲染、IPC 调用
  controls.ts        逐命令的参数表单构建器
  i18n.ts            中英文案表、查找与 DOM 本地化
  theme.ts           浅色 / 深色 / 跟随系统
  types.ts           共享数据结构、命令树构建、开关过滤
index.html           用 data-i18n 键标注的静态骨架
src-tauri/
  src/lib.rs         模块装配与 E#<key>|<detail> 错误约定
  src/schema.rs      cobra 反射：__complete 递归 + --help 解析
  src/runner.rs      argv 构造、shell 引用、操作系统管道
  src/commands.rs    IPC 命令与反射缓存
  src/bundle.rs      内置二进制的解出逻辑
  src/toolpack.rs    按工具人工整理的内容
  src/bin/dump_schema.rs   打印反射摘要的命令行辅助程序
  toolpacks/goalign.json   预设与位置参数标注
  tools/goalign.exe        内置二进制（有意入库）
  capabilities/default.json  对话框 + window:allow-set-theme 权限
samples/demo.fasta   能让每个预设都有效果的比对
docs/en, docs/zh     两棵文档树
LICENSES/GPL-2.0.txt GoAlign 的许可全文
```

## 标识符与路径

crate 名 `seqpanel`、库名 `seq_panel`、Tauri identifier `app.seq.panel`——`%APPDATA%` 下那个目录名
就是它。`localStorage` 的键前缀是 `seqpanel.`。改 identifier 会把用户的应用数据目录甩在身后，属于
破坏性变更。

改*项目目录名*也有另一层代价：`src-tauri/target/` 里缓存的是绝对路径，所以挪动目录之后要先
`rm -rf src-tauri/target` 再构建。
