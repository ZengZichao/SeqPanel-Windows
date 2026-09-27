# Getting started

## What you need

Windows 10 or 11 and the [WebView2 Runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/).
Windows 11 ships it; some older Windows 10 installs need the evergreen bootstrapper once. That
is the whole list — no Python, no .NET, no Go, no Node.js, and nothing to install for GoAlign.

## First launch

Start `seqpanel.exe`. The window opens with the embedded CLI already selected and the status
line filling in as the panel reflects it:

```
GoAlign  ·  v0.4.1  ·  76 runnable commands / 42 top-level groups  ·  command tree reflected
```

The first reflection spawns the CLI once per command, so it takes a few seconds. Every later
launch reads the cached schema and is instant — the status line then says
`command tree from cache`.

If the status line is red instead, the panel could not start the binary. The most common cause
is a path that no longer exists after a Windows update; press **Use bundled GoAlign** to point
at the copy shipped inside the executable again.

## The two ways to supply an alignment

**A file.** Pick *Alignment file (passes --align)* and either type a path or press **Browse…**
next to the flag itself. GoAlign reads plain and compressed files — `.fasta`, `.fa`, `.phy`,
`.nexus`, `.nxs`, `.clustal`, `.stockholm`, and any of them wrapped in `.gz`, `.bz2` or `.xz`.

**Pasted text.** Pick *Paste directly* and drop the alignment into the box. The panel writes it
to the child process's stdin, which is exactly what `-i` defaults to on the command line.

The repository ships `samples/demo.fasta`, an eight-sequence nucleotide alignment built to make
every preset do something visible: `species_C` carries a three-site deletion, `Long_name_taxon_F`,
`Long_name_taxon_G` and `taxon_H` are byte-identical to each other, and two names are long enough
for `trim name` to matter.

## Choosing which tool the panel drives

The path box at the top left is editable. Point it at any cobra-based executable and the panel
re-reflects and becomes a panel for that tool — GoTree works this way too. **Choose…** opens a
file picker; **Use bundled GoAlign** restores the embedded one; **Re-reflect commands** forces a
fresh walk of the current binary.

Presets and positional-argument hints only appear for tools that have a
[tool pack](command-reference.md#adding-a-tool-pack-for-another-cli). Everything else — the tree,
the forms, the pipelines — comes from reflection and works for any cobra binary.

## Your first command

1. Type the path to `samples/demo.fasta` in **Input**.
2. In **Commands**, expand `stats` and click the group header (it is a command *and* a group).
3. Press **Run**.

The result column shows one green row per step and then the statistics table:

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

**Equivalent command line** above it shows what actually ran:

```
stats --align 'F:\ZengZichao\...\samples\demo.fasta'
```

Copy that line into a terminal and you get the same output — the panel adds nothing of its own.

## Saving a result

**Save output…** writes stdout to a file you name (`.fasta`, `.phy`, `.nx`, `.png`, `.txt` — the
dialog does not restrict the extension). A PNG drawing produced by `draw png` is saved as image
bytes, not as text.

## Next steps

- [Interface tour](interface.md) — what every control does.
- [Workflows and pipelines](workflows.md) — chaining commands, and knowing when a chain must stop.
- [Troubleshooting](troubleshooting.md) — when GoAlign refuses your file.
