# GoAlign command reference

## How the command tree is reflected

SeqPanel does not know what GoAlign can do until it asks. On the first run against a binary it
spawns the CLI once per command, reads the machine-facing output cobra already produces, and
builds a schema from it:

1. `goalign __complete ""` enumerates the top-level commands.
2. For each parent, `goalign __complete <parent> ""` enumerates its children, so the walk
   reaches every leaf.
3. For each leaf, `goalign <path> --help` is parsed: the `Flags:` block gives the command's own
   flags, `Global Flags:` gives the inherited ones, and each line yields the long name, the
   short alias, the value type, the default and the description. A usage line containing
   `[command]` marks a group, `[flags]` marks something runnable — a command can be both, and
   GoAlign has two of those (`replace`, `stats`).

Hidden cobra commands (`help`, `completion`, `shell`, anything starting with `__`) are dropped.
The result is cached against the binary's file name and modification time, so re-launching is
instant; **Re-reflect commands** in the header forces a fresh walk.

What came out of the embedded GoAlign v0.4.1:

| | |
|---|---|
| Runnable commands | 76 |
| Nested under a parent | 43 |
| Top-level groups | 42 |
| Command-private flags | 244 (average 3.2 per command) |
| Commands accepting `-o, --output` | 53 of 76 |
| Commands that are both runnable and a parent | `replace`, `stats` |

## Input, output and format

Every command inherits `-i, --align <file>` (default `stdin`) and most inherit
`-o, --output <file>` (default `stdout`). SeqPanel keys its file pickers off the *semantic
role* of a flag rather than off its name, so the input box in the **Input** column always feeds
whatever the target CLI happens to call it — `--align` here, `--input` in GoTree.

The input format is chosen with `-p` (phylip), `-x` (nexus), `-u` (clustal), `-k` (stockholm),
or `--auto-detect`, which tries fasta → nexus → phylip → clustal and treats phylip as
non-strict. Without any of them the input is FASTA. Output format is not a flag: you pick a
`reformat <format>` command as the last step of the chain. `.gz`, `.bz2` and `.xz` inputs are
read transparently.

## The two things reflection cannot see

**Positional arguments.** Cobra never advertises that a command reads bare arguments, and
GoAlign has five such commands — extra words on the command line are silently used by these
five and silently ignored by the other 71:

| Command | Positional arguments |
|---|---|
| `append` | alignment files to append to the input alignment |
| `concat` | alignment files to concatenate with the input alignment |
| `revcomp` | sequence names to reverse-complement (none given = the whole alignment) |
| `subset` | sequence names to keep (`--indices` for 0-based positions, `--regexp` for patterns) |
| `subsites` | 0-based site positions to keep (`--reverse` drops them instead) |

**Workflow presets.** A curated list of multi-step chains, offered as buttons in the header.

Both live in a *tool pack*: `src-tauri/toolpacks/goalign.json`.

## Command groups

The `Flags` column is the number of command-private flags; `· -o` marks a command that can
write to a file instead of stdout. Descriptions are the upstream first line, verbatim.
### `addid` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign addid` | 4 | This command adds an indentifier (string) to all sequences of an input alignment |

### `append` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign append` | 1 · `-o` | Append alignments to an input alignment. |

### `build` (3)

| Command | Flags | What it does |
|---|---|---|
| `goalign build distboot` | 6 · `-o` | Builds bootstrap distances matrices |
| `goalign build seqboot` | 8 | Generates n bootstrap alignments from input alignment. |
| `goalign build weightboot` | 2 · `-o` | generate continous weights for all positions of the input alignment |

### `clean` (2)

| Command | Flags | What it does |
|---|---|---|
| `goalign clean seqs` | 1 · `-o` | Removes sequences constituted of gaps |
| `goalign clean sites` | 4 · `-o` | Removes sites constituted of specific characters |

### `codonalign` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign codonalign` | 2 · `-o` | Aligns a given nt fasta file using a corresponding aa alignment. |

### `compress` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign compress` | 2 · `-o` | Removes identical patterns/sites from an input alignment |

### `compute` (4)

| Command | Flags | What it does |
|---|---|---|
| `goalign compute distance` | 9 · `-o` | Compute distance matrix |
| `goalign compute entropy` | 2 | Computes entropy of a given alignment. |
| `goalign compute pssm` | 3 | Computes and prints a Position specific scoring matrix. |
| `goalign compute simplot` | 11 · `-o` | Compute simplot data |

### `concat` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign concat` | 3 · `-o` | Concatenates a set of alignments. |

### `consensus` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign consensus` | 4 · `-o` | Compute the majority consensus of an input alignment. |

### `convertgff` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign convertgff` | 4 · `-o` | This command converts the coordinates of an input GFF file from one reference se |

### `dedup` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign dedup` | 5 · `-o` | Deduplicate sequences that have the same sequence |

### `diff` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign diff` | 4 · `-o` | Prints only characters that are different from the first sequence of the alignme |

### `divide` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign divide` | 5 · `-o` | Divide an input alignment in several output files |

### `draw` (2)

| Command | Flags | What it does |
|---|---|---|
| `goalign draw biojs` | 0 · `-o` | Draw alignments in html file using msaviewer from biojs |
| `goalign draw png` | 0 · `-o` | Draw alignments in a png file |

### `extract` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign extract` | 7 · `-o` | This command extracts several sub-alignments from an input alignment. |

### `identical` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign identical` | 1 | Assess whether the two alignments are identical. |

### `mask` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign mask` | 10 · `-o` | Mask a part of the input alignment (replace by N/X by default) |

### `mutate` (3)

| Command | Flags | What it does |
|---|---|---|
| `goalign mutate ambig` | 1 · `-o` | Adds ambiguities uniformly to an input alignment. |
| `goalign mutate gaps` | 2 · `-o` | Adds gaps uniformly in an input alignment. |
| `goalign mutate snvs` | 0 · `-o` | Adds substitutions uniformly in an input alignment. |

### `orf` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign orf` | 2 · `-o` | Find the longest orf in all given sequences in forward strand. |

### `phase` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign phase` | 14 · `-o` | Find best Starts and set them as new start positions. |

### `phasent` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign phasent` | 15 · `-o` | Find best Starts and set them as new start positions. |

### `random` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign random` | 4 | Generate random sequences. |

### `reformat` (7)

| Command | Flags | What it does |
|---|---|---|
| `goalign reformat clustal` | 0 · `-o` | Reformats an alignment into Clustal format. |
| `goalign reformat fasta` | 0 · `-o` | Reformats an alignment into Fasta. |
| `goalign reformat nexus` | 0 · `-o` | Reformats an alignment into nexus format. |
| `goalign reformat paml` | 0 · `-o` | Reformats an alignment into input data for PAML. |
| `goalign reformat phylip` | 0 · `-o` | Reformats an alignment into Phylip. |
| `goalign reformat stockholm` | 0 · `-o` | Reformats an alignment into Stockholm format. |
| `goalign reformat tnt` | 0 · `-o` | Reformats an alignment into input data for TNT. |

### `rename` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign rename` | 7 · `-o` | Rename sequences of the input tree, given a map file. |

### `replace` (2)

| Command | Flags | What it does |
|---|---|---|
| `goalign replace` | 6 · `-o` | Replace characters in sequences of the input alignment (possible with a regex). |
| `goalign replace stops` | 2 · `-o` | Replace STOP codons in input nt sequences by NNN, in the given phase (except the |

### `revcomp` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign revcomp` | 2 · `-o` | Prints the reverse complement of all sequences of the alignement. |

### `sample` (3)

| Command | Flags | What it does |
|---|---|---|
| `goalign sample rarefy` | 5 · `-o` | Take a new sample taking into accounts weights. |
| `goalign sample seqs` | 4 · `-o` | Samples a subset of sequences from the input alignment. |
| `goalign sample sites` | 4 · `-o` | Take a random subalignment. |

### `shuffle` (5)

| Command | Flags | What it does |
|---|---|---|
| `goalign shuffle recomb` | 4 · `-o` | Recombine of sequences in the input alignment. |
| `goalign shuffle rogue` | 3 · `-o` | Simulate rogue by shuffling sites of some sequences. |
| `goalign shuffle seqs` | 1 · `-o` | Shuffle sequence order in alignment. |
| `goalign shuffle sites` | 4 · `-o` | Shuffles n alignment sites vertically. |
| `goalign shuffle swap` | 2 · `-o` | Swap portion of sequences in the input alignment. |

### `sort` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign sort` | 2 · `-o` | sorts input algignment by sequence name. |

### `split` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign split` | 2 | Splits an input alignment given a partition file. |

### `stats` (12)

| Command | Flags | What it does |
|---|---|---|
| `goalign stats` | 3 | Prints different characteristics of the alignment. |
| `goalign stats alleles` | 0 | Prints the average number of alleles per sites of the alignment. |
| `goalign stats alphabet` | 1 | Prints the alphabet detected for the input alignment. |
| `goalign stats char` | 2 | Prints frequence of different characters (aa/nt) of the alignment. |
| `goalign stats gaps` | 4 | Print gap stats on each alignment sequence. |
| `goalign stats length` | 1 | Prints the length of sequences in the alignment. |
| `goalign stats maxchar` | 3 | Prints the character with the highest occcurence for each site of the alignment. |
| `goalign stats mutations` | 1 | Print mutations stats on each alignment sequence. |
| `goalign stats mutations list` | 2 | Print mutations list of each alignment sequence. |
| `goalign stats nalign` | 0 | Prints the number of alignments in the input file |
| `goalign stats nseq` | 1 | Prints the number of sequences in the alignment. |
| `goalign stats taxa` | 1 | Prints index (position) and name of taxa of the alignment file. |

### `subseq` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign subseq` | 6 · `-o` | Take a sub-alignment from the input alignment |

### `subset` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign subset` | 7 · `-o` | Take a subset of sequences from the input alignment |

### `subsites` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign subsites` | 5 · `-o` | Takes a subset of the sites of the alignment |

### `sw` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign sw` | 6 · `-o` | Aligns 2 sequences using Smith&Waterman algorithm. |

### `tolower` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign tolower` | 2 · `-o` | Replace upper case characters by lower case characters. |

### `toupper` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign toupper` | 2 · `-o` | Replace lower case characters by upper case characters. |

### `translate` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign translate` | 5 · `-o` | Translates an input alignment in amino acids. |

### `transpose` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign transpose` | 1 · `-o` | Transposes an input alignment such that the sequences |

### `trim` (2)

| Command | Flags | What it does |
|---|---|---|
| `goalign trim name` | 4 | This command trims names of sequences. |
| `goalign trim seq` | 2 | Trims sequences of the alignemnt |

### `unalign` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign unalign` | 1 | Unaligns an input alignment, by removing indels. |

### `version` (1)

| Command | Flags | What it does |
|---|---|---|
| `goalign version` | 0 | Prints the current version of goalign |

## Adding a tool pack for another CLI

Nothing in the panel is GoAlign-specific except this JSON file. To give another cobra binary the
same treatment, drop a file next to it and match the name prefix in
`src-tauri/src/toolpack.rs`:

```json
{
  "displayName": "MyTool",
  "positional": {
    "prune": {
      "label": "taxon names",
      "labelZh": "<the same label in Chinese>",
      "help": "Names to remove from the tree.",
      "helpZh": "<the same help in Chinese>",
      "minimum": 1
    }
  },
  "templates": [
    {
      "name": "Prune then draw",
      "nameZh": "<the same name in Chinese>",
      "description": "Drop two taxa and render the result.",
      "descriptionZh": "<the same description in Chinese>",
      "steps": [
        { "command": "prune", "flags": {}, "args": ["taxonA", "taxonB"] },
        { "command": "draw svg", "flags": { "width": 900 } }
      ]
    }
  ]
}
```

The `*Zh` fields are optional; the front end falls back to the English value when one is missing.

`steps[].command` must be the exact reflected command id, and `flags` are keyed by long flag
name without the leading dashes. A template whose commands do not exist in the current binary
simply reports that in the status line instead of failing — reflection, not the pack, is the
source of truth. Set `"terminal": true` when the last step consumes the alignment (or tree)
rather than emitting one, so the panel does not suggest continuing the chain.

To check what the reflector actually saw, build the helper binary:

```bash
cd src-tauri && cargo build --release --bin dump_schema
./target/release/dump_schema.exe "C:\\path\\to\\tool.exe" schema.json
```

It prints the same counts quoted at the top of this page and writes the full schema as JSON.
