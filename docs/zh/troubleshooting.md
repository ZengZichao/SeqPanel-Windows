# 故障排查

## 先学会读 GoAlign 的输出

失败的步骤退出码是 1，并在 stderr 写：

```
[Error] in cmd/computedist.go (line 33), message: Unknown model: foo

Usage:
  goalign compute distance [flags]
  ……然后把整段 usage 再刷一遍……
```

SeqPanel 会把 `message:` 后面那段抽出来，单独显示在失败步骤上；原始 stderr（含那一大坨 usage）留在
**原始 stderr** 折叠块里。如果抽出来的那句看不出问题，原始块里通常有真正写错的开关名。

警告是另一回事：`[Warning] in cmd/cleanseqs.go ... #seqs after cleaning=7` 出现在 stderr，但命令
**是成功的**。这一步显示为绿色，而且就应该显示为绿色。

## 面板起不来，或者反射不出来

| 现象 | 原因 | 怎么办 |
|---|---|---|
| 双击 exe 毫无反应 | 较老的 Windows 10 缺 WebView2 Runtime | 装一次常青版 WebView2。这是唯一的外部依赖，Tauri 绕不过去。 |
| `找不到可执行文件：...` | 记住的路径失效了（工具被挪走、盘符变了） | 点**用内置 GoAlign**。 |
| `反射失败：...` | 目标不是 cobra 程序，或者它对 `__complete` 返回非零 | 反射依赖 `__complete` 与 `--help`，非 cobra 的工具驱动不了。 |
| 状态栏版本为空 | CLI 编译时没注入版本字符串 | 用 `-ldflags "-X github.com/evolbioinfo/goalign/version.Version=v0.4.1"` 重编。 |
| 换了二进制但命令表没变 | 缓存键是文件名 + 修改时间，而且 `localStorage` 还指着上一次解出来的那份 | 点**用内置 GoAlign**，再点**重新反射命令表**。 |
| 删掉 `%APPDATA%\app.seq.panel` 就好了 | 缓存坏了，或内置工具只解出一半 | 这个目录整个都是可再生的——语言、主题、路径、缓存会一起重置。 |

## “跑了但结果是空的”

最常见的原因是那条命令写**文件**而不是写 stdout。`build seqboot`、`build distboot`、
`build weightboot` 每个重复出一个文件；`sample sites --nsamples 2` 也一样，而且它的输出文件名取自
`--output`，所以 `--output` 留成 `stdout` 时会得到 `stdout_0..fa` 这类怪名字。结果区空白不代表失败
——去那个目录看，并给 `--output` 一个真实路径。

也要看步骤行：如果某步是绿的却没有产物，展开它的原始 stderr。

## `fasta file should start with a >`

GoAlign 拿到的东西和它假定的格式不是一回事。三种典型触发方式：

1. **把终止命令放在了链条中间。** `stats`、`compute distance`、`draw png` 和 `build *` 不输出比对，
   接在它们后面的命令收到的是表格或 PNG，于是报这个错。链条到它们为止。
2. **非 FASTA 文件被当成 FASTA 读。** 给第一步加上正确的开关——`-p` phylip、`-x` nexus、`-u`
   clustal、`-k` stockholm——或者用 `--auto-detect`。
3. **粘贴模式里带了表头行或首行是空行。** 粘贴的内容会原样进 stdin，第一行必须是 `>`。

`--auto-detect` 是万能钥匙，但要知道两件事：它按 fasta → nexus → phylip → clustal 顺序试，而且在该
模式下 phylip 按*非严格*处理。需要严格 phylip 就显式写 `-p --input-strict`。

## 数字看着不对

| 现象 | 原因 |
|---|---|
| 同一条链两次跑出不同比对 | 任何 `sample`、`shuffle`、`random`、`mutate`、`build` 命令在不给 `--seed` 时都用时钟做种子。给它一个种子。 |
| `clean sites` 什么都没删 | 默认 `--cutoff 0.5` 要求某列至少一半都是目标字符。要“含一个就删”用 `--cutoff 0`。 |
| `clean seqs` 删掉了你想留的序列 | 序列侧用的是同一套 cutoff 逻辑；看那条 `[Warning]` 里报告被删的是谁。 |
| `dedup` 把你以为不同的序列合并了 | 它比较的是序列内容（含缺口）。`--n-as-gap` 把 `N`/`X` 视作缺口，`--name` 改为按名字去重。 |
| 距离出现负数或 `NaN` | 序列几乎完全相同却套了校正模型，或者清洗后有信息的位点太少。用 `--average` 只看一个总平均值做体检。 |
| `translate` 的结果移帧了 | `--phase` 与 `--ref-seq` 控制阅读框；默认假定比对从密码子边界开始。 |
| Phylip 输出的名字被下游程序拒绝或截断 | Phylip 限制名字长度。`trim name --nb-char 10`（或 `--auto`）可以解决，`--out-map` 会写出映射表以便还原。 |

## 随机结果不可复现

`--seed` 是所有命令都继承的开关，在链条第一步设好即可；但它是*按进程*生效的种子。如果一条链里有两个
随机化步骤，就给这两步各自一个明确的 `--seed`。

## 画出来的图看不清

`draw png` 按设计就是一个字符一个像素，所以 300 个位点的比对就是 300 像素宽，面板也按原始尺寸显示。
它是用来看模式的，不是用来出图的。要真正的图请用 `draw biojs`（保存那份 HTML 再用浏览器打开），或者
把比对导出后在别处绘制。

## 还是没解决

点**复制**把**等价命令行**拿到终端里跑一遍。如果终端里也失败，那问题出在 CLI 调用而不是面板——同
一行也正是你去 [上游](https://github.com/evolbioinfo/goalign/issues) 提问时要贴的东西。
