# SeqPanel 文档

SeqPanel 是一个面向 cobra 架构进化生物学命令行工具的 Windows 图形操作面板。它**内置
GoAlign v0.4.1**，会把你所指向的二进制的命令树反射出来，并用真实的管道执行你搭出的链条。

[项目主页](../../README.zh-CN.md) · [English documentation](../en/README.md)

![中文深色界面](../images/interface-zh-dark.png)

## 各页内容

| 页面 | 回答什么 |
|---|---|
| [快速上手](getting-started.md) | 要装什么、首次启动长什么样、第一条命令怎么跑 |
| [界面导览](interface.md) | 每个控件、每一列、每条状态提示 |
| [工作流与流水线](workflows.md) | 串命令、预设工作流、可直接照抄的配方、链条该在哪里终止 |
| [语言与主题](language-and-theme.md) | 什么会翻译、什么故意不翻译、选择存在哪里 |
| [命令覆盖](command-reference.md) | 反射如何工作、76 个命令按组分列、如何为别的 CLI 写工具包 |
| [从源码构建](building-from-source.md) | 工具链、开发循环、单文件发布构建、测试、重编内置 CLI |
| [故障排查](troubleshooting.md) | 读懂 GoAlign 的报错、结果为空、格式抱怨、看起来不对的数字 |

## 开始前值得先知道的五件事

1. **界面里没有黑箱。** 每条链都会显示等价命令行，复制到终端就能得到同样结果。
2. **输入开关是 `--align`，不是 `--input`。** GoAlign 用 `--align` 收输入、`--output` 出输出；
   面板用的是被反射二进制自己的叫法。
3. **有些命令会终止链条。** `stats`、`compute distance`、`draw png` 会消费比对并输出别的东西，
   只能放在最后。
4. **有 5 个命令读裸参数**，而 `--help` 从不说明：`append`、`concat`、`revcomp`、`subset`、
   `subsites`。面板只为这 5 个命令显示位置参数输入行。
5. **唯一的外部依赖是 WebView2 Runtime**，Windows 11 自带。

## 求助渠道

使用问题与缺陷请在本仓库提 issue。GoAlign 自身的行为（某命令支持哪些模型、某个开关到底做
什么）属于上游范畴，以 `goalign <command> --help` 为准——面板的界面正是从这份文本生成的。
