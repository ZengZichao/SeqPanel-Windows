# Interface tour

![English light interface](../images/interface-en-light.png)

The window has a header, a status line, and three columns: commands, input and parameters,
workflow and result.

## Header

| Control | What it does |
|---|---|
| **Executable** box | The binary the panel drives. Editable — type a path and press Enter to re-reflect. |
| **Browse…** | File picker for the same thing (`exe`, `bin` or any file). |
| **Use bundled GoAlign** | Points the panel at the copy of GoAlign compiled into `seqpanel.exe` and unpacked to `%APPDATA%\app.seq.panel\tools\`. |
| **Re-reflect commands** | Ignores the cache and walks `--help` again. Needed after you swap the binary, since the cache key is file name + modification time. |
| **Preset workflow buttons** | Replace the current chain with a curated multi-step one. Five ship for GoAlign. |
| **Language** | 中文 / English, applied instantly and stored. |
| **Theme** | Follow system / Light / Dark, including the native title bar. |

## Status line

One line, three states: neutral while working, amber for a warning, red for a failure. It
reports the reflected tool, its version, the command counts and whether the tree came from the
cache, then the outcome of the last action:

```
GoAlign  ·  v0.4.1  ·  76 runnable commands / 42 top-level groups  ·  command tree from cache
Done · 3 steps · 86 ms
1 of 2 steps failed · fasta file should start with a >
```

Backend errors arrive as `E#<key>|<detail>` and are rendered in whichever language the interface
is currently showing.

## Column 1 — Commands

The reflected tree, sorted, with each command's upstream description beside it. The search box
filters by command id *or* description and keeps matching parents visible.

Two visual cases are worth knowing:

- A plain group (`build`, `clean`, `compute`, …) is only a container — clicking it does nothing.
- A **runnable** group carries a `runnable` badge, because in cobra a command can both run and
  own subcommands. GoAlign has two: `replace` and `stats`. Clicking the header adds the command
  itself; the children underneath are separate commands.

Clicking any command appends it to the workflow and opens its form.

## Column 2 — Input, then Parameters

**Input** offers two mutually exclusive modes: a file path (handed to the CLI's input flag) or
pasted text (written to the first child process's stdin). The path is remembered between runs.

**Parameters** is generated per command and split in two:

- **Command flags** — what the command's own `Flags:` block declares.
- **Shared flags (n)** — a collapsed block holding the inherited ones. For GoAlign these are the
  14 root-level flags every command carries (`--align`, `--phylip`, `--nexus`, `--clustal`,
  `--stockholm`, `--auto-detect`, `--alphabet`, `--threads`, `--seed`, `--ignore-identical`,
  `--input-strict`, `--output-strict`, `--one-line`, `--no-block`) plus whatever the parent group
  adds, so `stats` shows 21.

Each row shows the long and short name, the value type, the upstream default and the upstream
description. Controls follow the reflected type: a checkbox for `bool`, a number box for `int` /
`float`, a text box for `string`, comma-separated entries for `stringSlice`, and a dropdown when
the description enumerates choices. Flags whose name or role marks them as a path get a
**Browse…** button (open for inputs, save for outputs).

When the selected command is one of the five that read bare positional arguments — `append`,
`concat`, `revcomp`, `subset`, `subsites` — an extra row appears with a curated label and a plain
text box; words separated by spaces become separate arguments. For every other command the row is
absent, because passing arguments there does nothing.

## Column 3 — Workflow, command line, Result

**Workflow** lists the chained steps in order. Click a step to edit it; the arrows reorder it;
`×` removes it. Steps are joined with real OS pipes: step *n*'s stdout is wired directly into
step *n+1*'s stdin, so no intermediate alignment ever touches your disk.

**Equivalent command line** is rendered by the same code that builds the process arguments, so it
cannot drift from what runs. Flags left at the CLI's own default are omitted. **Copy** puts it on
the clipboard.

**Result** shows one row per step. A failed step carries the message extracted from GoAlign's
`[Error] in cmd/<file>.go (line N), message: <reason>` line, with the raw stderr — including the
usage dump — behind a collapsible block. Below the step rows:

- text is shown as a monospace block (alignments, statistics tables, distance matrices),
- a PNG from `draw png` is displayed inline,
- SVG output is displayed inline as well, with a `viewBox` injected when the generator omitted
  one so it scales.

**Save output…** enables after a run and writes whatever the last step produced.
