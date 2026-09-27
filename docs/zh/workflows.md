# 工作流与流水线

SeqPanel 唯一的抽象就是链条：命令按顺序叠加，stdout 接下一个 stdin。下面所有内容本质上都还是你
自己也能敲出来的 shell 管道。

## 决定链条能在哪儿停的那条规则

多数 GoAlign 命令读一份比对、输出一份比对，因此可以随意串。少数命令读比对但输出别的东西——统计
表、距离矩阵、PNG、分区文件——这些就是终止步：后面再接命令，等于把一张表喂给等着读 FASTA 的程序，
于是得到 `fasta file should start with a >`。

| 终止命令 | 它们输出 |
|---|---|
| `stats`、`stats <任意子命令>`、`identical`、`diff` | 表格与报告 |
| `compute distance`、`compute entropy`、`compute pssm`、`compute simplot` | 矩阵与谱型 |
| `draw png`、`draw biojs` | 一张 PNG / 一个 HTML 页面 |
| `build seqboot`、`build distboot`、`build weightboot` | 磁盘上的文件（见下文） |

其余命令——`clean`、`subset`、`subsites`、`trim`、`mask`、`mutate`、`shuffle`、`sort`、`rename`、
`revcomp`、`translate`、`dedup`、`concat`、`append`、`reformat *`——都会把比对传下去，后面可以
继续接。

## 开关规则

只有偏离 CLI 自身默认值的开关才会进入命令行：未勾选的复选框消失、空文本框消失、等于上游默认值的
数字被丢弃。这就是等价命令行保持简短、且面板结果与手敲完全一致的原因。`stringSlice` 用逗号分隔
多项。

格式开关属于*输入*侧（`-p`、`-x`、`-u`、`-k`、`--auto-detect`）；*输出*格式不是开关，而是把某个
`reformat <格式>` 作为链条最后一步。

## 预设

顶栏的 5 个按钮，每一条都对着内置二进制实测过：

| 预设 | 链条 |
|---|---|
| 去缺口后统计 | `clean seqs` → `clean sites --char GAP --cutoff 0` → `stats` |
| 两两距离矩阵 | `compute distance --model k2p --rm-gaps` |
| 比对热图 | `draw png` |
| 截短序列名并导出 Phylip | `trim name --nb-char 12` → `reformat phylip` |
| 去重并导出 Nexus | `dedup` → `reformat nexus` |

点预设会替换当前工作流，之后表单照常可改。

## 配方

先载入 `samples/demo.fasta`，下面每条都能原样跑通。

### 清掉缺口但别丢数据

`clean seqs` 删除缺口比例超过阈值的序列，`clean sites` 删除列。默认 `--cutoff 0.5` 意味着要一半
以上都是缺口才会被删；`--cutoff 0` 则是只要含缺口就删：

```
clean seqs | clean sites --char GAP --cutoff 0 | stats
```

这两个命令成功时也会在 stderr 打 `[Warning] ... #seqs after cleaning=7`。面板把它们留在可展开的
stderr 块里，不会被当成失败。`clean sites --positions kept.pos` 还能把保留下来的坐标写出来，
方便日后把结果映射回原始比对。

### 只保留想要的类群

`subset` 用裸参数接收序列名——因为 cobra 从不声明这件事，这一行才由面板补上：

```
subset species_A species_C species_D | stats
```

`--revert` 反过来选，`--indices` 把参数改成 0 起序号，`--regexp --remove-gaps` 把参数当正则。

### 取指定位点

```
subsites 0 1 2 3 4 5 --reverse
```

保留*除了*前六个位点之外的一切。`--informative` 改为挑选 parsimony 信息位点，`--ref-seq` 让坐标
相对某条序列解释，`--sitefile` 从文件读位置。

### 转格式

```
reformat phylip            # 也可以是 fasta、nexus、clustal、stockholm、paml、tnt
```

Phylip 输出还可以用 `--output-strict`、`--one-line` 调整。反过来说，*读*非 FASTA 格式要在第一
步告诉它：`-x` nexus、`-p` phylip，或者用 `--auto-detect` 让它自己嗅探。

### 比对与序列之间来回

`unalign` 把比对拆成单独序列，`transpose` 交换序列与位点，`codonalign` / `translate` / `phase` /
`phasent` 在核酸与氨基酸视角之间转换，`orf` 抽取开放阅读框，`replace stops` 处理终止密码子。

### 抽样与随机化

```
sample sites --length 20 --nsamples 1 --seed 42
shuffle sites | shuffle seqs | mutate gaps --prop-seq 0.05
```

`--seed` 让上面这些可复现；不给就用时钟做种子。`mutate gaps` 用 `-n, --prop-seq` 指定要在多大
比例的序列里加缺口。

### 距离与谱型

```
compute distance --model k2p --rm-gaps
compute entropy --remove-gaps
```

两者都是终止步。`compute distance` 写出的是 phylip 风格矩阵，可以直接交给本面板之外的任何基于
距离的建树程序。

### 画出来

```
draw png
```

一行一条序列、一个字符一个像素——朴素但诚实的热图，直接内嵌显示。想要真正的图就用
`draw biojs`（保存那份 HTML 再用浏览器打开）。

### 合并多份比对

`append` 和 `concat` 都用裸参数接收文件：

```
append second.fasta third.fasta
concat second.fasta --out-partition parts.nex
```

`append` 纵向叠加序列，`concat` 按序列名横向拼接列，`--out-partition` 记录每份输入落在拼接结果的
哪个区间。

### 当命令写文件而不是写 stdout

`build seqboot --nboot 100 --out-prefix boot` 以及其余 `build *` 命令每个重复出一个文件；
`sample sites --nsamples 2` 同理。结果区空白是因为没有任何东西走 stdout，而不是面板出错。给
`--output` 一个真实路径，然后去那个目录看。

## 在面板之外复用链条

搭好链，点**等价命令行**旁的**复制**，粘到终端即可。唯一的差别是：面板始终通过 stdin 传输入，而
文件模式下复制出来的那行会带上 `--align` 的路径。
