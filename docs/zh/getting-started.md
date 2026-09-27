# 快速上手

## 需要准备什么

Windows 10 或 11，以及 [WebView2 Runtime](https://learn.microsoft.com/zh-cn/microsoft-edge/webview2/)
（Win11 自带，部分较老的 Win10 需要装一次常青版引导程序）。就这些——不需要 Python、.NET、Go、
Node.js，GoAlign 也不需要单独安装。

## 首次启动

双击 `seqpanel.exe`。窗口打开时内置 CLI 已经选好，状态栏会在面板反射命令表的过程中逐步填完：

```
GoAlign  ·  v0.4.1  ·  76 个可执行命令 / 42 个顶层命令族  ·  命令表已重新反射
```

第一次反射要为每条命令各起一次进程，所以会花几秒。之后每次启动都读缓存，瞬时完成——此时状态栏
写的是 `命令表来自缓存`。

如果状态栏变红，说明面板没能启动那个二进制。最常见的原因是 Windows 更新后路径失效，点
**用内置 GoAlign** 重新指向可执行文件里自带的那份即可。

## 提供比对的两条路径

**文件。** 选 *比对文件（传 --align）*，然后手填路径，或在开关旁边点 **浏览…**。GoAlign 能直接
读普通文件和压缩文件——`.fasta`、`.fa`、`.phy`、`.nexus`、`.nxs`、`.clustal`、`.stockholm`，
以及它们任一的 `.gz`、`.bz2`、`.xz` 压缩版。

**粘贴。** 选 *直接粘贴*，把比对丢进文本框。面板会把它写进第一个子进程的 stdin，这正好就是
`-i` 的默认行为。

仓库自带 `samples/demo.fasta`：一份八条序列的核酸比对，数据是特意造的，保证每个预设都有肉眼可见
的效果——`species_C` 带一个三位点的缺失，`Long_name_taxon_F`、`Long_name_taxon_G`、`taxon_H`
三者完全相同，还有两个名字长到足够让 `trim name` 有事可做。

## 选择面板驱动哪个工具

左上角的路径框可以直接编辑。把它指向任意 cobra 架构的可执行文件，面板会重新反射并变成那个工具
的面板——GoTree 也是这样用的。**选择…** 打开文件对话框；**用内置 GoAlign** 回到随 `seqpanel.exe`
分发的那份；**重新反射命令表** 强制重走一遍当前二进制。

预设和位置参数提示只对有[工具包](command-reference.md#给别的-cli-加工具包)的工具出现。其余一切
（命令树、表单、流水线）都来自反射，对任何 cobra 二进制都成立。

## 第一条命令

1. 在**输入**里填 `samples/demo.fasta` 的路径。
2. 在**命令表**里展开 `stats`，点它的组标题（它既是命令也是组）。
3. 点**运行**。

结果区先给每个步骤一行绿色记录，然后是统计表：

```
length        60
nseqs         8
avgalleles    1.0500
variable sites 2
char  nb  freq
A     104 0.247619
...
alphabet      nucleotide
```

它上方的**等价命令行**显示真正执行了什么：

```
stats --align 'F:\ZengZichao\...\samples\demo.fasta'
```

把这行抄进终端会得到同样的输出——面板没有往里加任何自己的东西。

## 保存结果

**保存输出…** 把 stdout 写到你命名的文件里（`.fasta`、`.phy`、`.nx`、`.png`、`.txt` 都行，对话框
不限制扩展名）。`draw png` 产出的 PNG 是按图片字节保存的，不是文本。

## 下一步

- [界面导览](interface.md)——每个控件做什么。
- [工作流与流水线](workflows.md)——串命令，以及判断链条该在哪儿停。
- [故障排查](troubleshooting.md)——GoAlign 拒绝你的文件时怎么办。
