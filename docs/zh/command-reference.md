# GoAlign 命令表

## 命令树是怎么反射出来的

在你指向某个二进制之前，SeqPanel 并不知道它能做什么。面板会对该二进制跑一次机器可读的探查：

1. `goalign __complete ""` 枚举顶层命令；
2. 对每个父命令再跑 `goalign __complete <父命令> ""`，如此递归到所有叶子；
3. 对每个叶子解析 `goalign <路径> --help`：`Flags:` 段给出该命令自己的开关，`Global Flags:` 段给出
   继承的开关，每一行提供长名、短名、值类型、默认值和说明。Usage 行里出现 `[command]` 说明它是
   命令组，出现 `[flags]` 说明它可执行——一个命令可以两者皆是，GoAlign 里就有两个：`replace` 和
   `stats`。

cobra 的隐藏命令（`help`、`completion`、`shell`，以及任何以 `__` 开头的）会被丢掉。结果按二进制
的文件名 + 修改时间缓存，所以再次启动是瞬时的；顶栏的**重新反射命令表**会强制重走一遍。

对内置的 GoAlign v0.4.1，反射出来的结果是：

| | |
|---|---|
| 可执行命令 | 76 |
| 其中嵌套在父命令下 | 43 |
| 顶层命令组 | 42 |
| 命令私有开关 | 244（平均每条命令 3.2 个） |
| 接受 `-o, --output` 的命令 | 76 个里有 53 个 |
| 既是命令又是组 | `replace`、`stats` |

## 输入、输出与格式

每条命令都继承 `-i, --align <文件>`（默认 `stdin`），多数还继承 `-o, --output <文件>`（默认
`stdout`）。面板的文件选择器认的是开关的*语义角色*而不是名字，所以**输入**列里那个路径永远喂给
目标 CLI 自己给输入起的那个名字——这里是 `--align`，GoTree 里是 `--input`。

输入格式用 `-p`（phylip）、`-x`（nexus）、`-u`（clustal）、`-k`（stockholm）指定，或者
`--auto-detect` 让它按 fasta → nexus → phylip → clustal 依次嗅探；什么都不给就是 FASTA。输出格式
不是开关，而是把某个 `reformat <格式>` 放在链尾。`.gz`、`.bz2`、`.xz` 压缩输入可以直接读。

## 反射看不到的两件事

**位置参数。** cobra 从不声明某条命令会读裸参数，而 GoAlign 有 5 条这样的命令——命令行上多出来的
词只会被这 5 条使用，被其余 71 条静默忽略：

| 命令 | 位置参数是什么 |
|---|---|
| `append` | 要追加到输入比对之后的比对文件 |
| `concat` | 要与输入比对拼接的比对文件 |
| `revcomp` | 只反向互补这些序列名（不给就整个比对） |
| `subset` | 要保留的序列名（`--indices` 改 0 起序号，`--regexp` 改正则） |
| `subsites` | 要保留的位点位置，0 起（`--reverse` 改为删除这些位点） |

**预设工作流。** 人工整理的多步链条，显示为顶栏按钮。

两者都写在*工具包*里：`src-tauri/toolpacks/goalign.json`。

## 按主题速查全部 76 条

命令名保持上游英文。下面按用途分组，每组列出可执行命令 id；具体开关一律以面板表单或
`goalign <命令> --help` 为准。

### 格式转换与读写

| 命令 | 用途 |
|---|---|
| `reformat fasta` / `reformat nexus` / `reformat phylip` / `reformat clustal` / `reformat stockholm` / `reformat tnt` / `reformat paml` | 把比对改写成目标格式（链尾常用） |
| `unalign` | 把比对拆成未比对的序列 |
| `transpose` | 序列与位点互换 |
| `compress` | 合并完全相同的位点模式并给出权重 |
| `divide` / `split` | 按大小或规则把一份比对切成多份 |
| `extract` | 从比对里抽取片段 |
| `convertgff` | 由 GFF 注释生成位点集合 |
| `version` | 打印版本（面板状态栏用的就是它） |

### 序列维度的编辑

| 命令 | 用途 |
|---|---|
| `clean seqs` | 删除缺口/特定字符过多的序列 |
| `subset` | 按名字（或序号、正则）保留/剔除序列 |
| `sort` | 按序列名排序 |
| `rename` / `replace` / `addid` / `trim name` | 改名、按映射替换（`replace` 既是命令也是组）、给名字加标识、截短名字 |
| `dedup` / `identical` | 去重；判断两份比对是否相同 |
| `revcomp` | 反向互补（可只针对指定序列） |
| `tolower` / `toupper` | 大小写切换（软掩码常用） |
| `subseq` | 按名字或序号取子序列 |
| `consensus` | 由比对生成一致性序列 |
| `sample seqs` / `sample rarefy` | 抽样子集 / 稀释式抽样 |
| `shuffle seqs` | 打乱序列顺序 |
| `append` / `concat` | 追加序列 / 按名字拼接列 |
| `random` | 生成随机比对 |

### 位点维度的编辑

| 命令 | 用途 |
|---|---|
| `clean sites` | 删除含指定字符的列（`--char`、`--cutoff`、`--ends`、`--reverse`） |
| `subsites` | 按位置取/删位点，或只取信息位点 |
| `mask` | 按位置、按唯一性、按参照序列把位点替换成 `N`/`X`/缺口 |
| `trim seq` | 按参照序列修剪末端 |
| `sample sites` / `shuffle sites` / `shuffle swap` | 随机取列、打乱列、交换列 |
| `sw` | 滑动窗口输出 |
| `subsites --informative` | parsimony 信息位点 |

### 密码子、读码框与突变

| 命令 | 用途 |
|---|---|
| `translate` / `codonalign` | 核酸→氨基酸、按密码子对齐 |
| `phase` / `phasent` | 按参照序列分相（两个命令开关最多，16 与 15 个） |
| `orf` | 抽取开放阅读框 |
| `replace stops` | 处理终止密码子 |
| `mutate ambig` / `mutate gaps` / `mutate snvs` | 引入 ambiguity、缺口、SNV |
| `shuffle recomb` / `shuffle rogue` | 重组式打乱、剔除不稳定序列 |

### 统计、距离与谱型（多为终止步）

| 命令 | 用途 |
|---|---|
| `stats` | 比对总体统计（长度、序列数、字符频率、信息位点等） |
| `stats nseq` / `stats length` / `stats alphabet` / `stats char` / `stats gaps` / `stats alleles` / `stats taxa` / `stats maxchar` / `stats nalign` | 单一指标的轻量输出 |
| `stats mutations` / `stats mutations list` | 突变计数与清单 |
| `compute distance` | 两两距离矩阵（`--model`、`--rm-gaps`、gamma 等） |
| `compute entropy` | 位点熵 |
| `compute pssm` | 位置权重矩阵 |
| `compute simplot` | 相似性图谱（跨比对滑动比较） |
| `diff` / `identical` | 两份比对的差异与一致性判断 |
| `build seqboot` / `build distboot` / `build weightboot` | 构建 bootstrap 重复（写文件） |

### 绘图

| 命令 | 用途 |
|---|---|
| `draw png` | 一行一序列、一字符一像素的热图，面板内嵌显示 |
| `draw biojs` | 自包含 HTML 查看器，保存后用浏览器打开 |

## 给别的 CLI 加工具包

面板里除了这个 JSON 之外没有任何 GoAlign 专属逻辑。要让别的 cobra 二进制获得同样待遇，在
`src-tauri/toolpacks/` 下并排放一个文件，并在 `src-tauri/src/toolpack.rs` 里匹配它的文件名前缀：

```json
{
  "displayName": "MyTool",
  "positional": {
    "prune": {
      "label": "taxon names",
      "labelZh": "类群名称",
      "help": "Names to remove from the tree.",
      "helpZh": "要从树中移除的类群名称。",
      "minimum": 1
    }
  },
  "templates": [
    {
      "name": "Prune then draw",
      "nameZh": "裁剪后绘图",
      "description": "Drop two taxa and render the result.",
      "descriptionZh": "删掉两个类群后输出图形。",
      "steps": [
        { "command": "prune", "flags": {}, "args": ["taxonA", "taxonB"] },
        { "command": "draw svg", "flags": { "width": 900 } }
      ]
    }
  ]
}
```

`steps[].command` 必须是反射出来的命令 id，`flags` 的键是不带前导短横线的长名。模板里如果有当前
版本不存在的命令，面板只会在状态栏提示，不会崩。若最后一步会消费比对（或树）而不再输出比对，给
模板加 `"terminal": true`。

想确认反射到底看到了什么，可以编译那个辅助程序：

```bash
cd src-tauri && cargo build --release --bin dump_schema
./target/release/dump_schema.exe "C:\\path\\to\\tool.exe" schema.json
```

它会打印本页开头那些数字，并把完整 schema 写成 JSON。
