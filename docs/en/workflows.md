# Workflows and pipelines

SeqPanel's only real abstraction is the chain: commands stacked in order, stdout piped into the
next stdin. Everything below is also a plain shell pipeline you could type yourself.

## The rule that decides where a chain can end

Most GoAlign commands read an alignment and print an alignment, so they compose freely. Some read
an alignment and print something else — statistics, a distance matrix, a PNG, a partition file.
Those are terminal: putting another command after them pipes a table into a program expecting
FASTA, which is how you get `fasta file should start with a >`.

| Terminal commands | They emit |
|---|---|
| `stats`, `stats <anything>`, `identical`, `diff` | tables and reports |
| `compute distance`, `compute entropy`, `compute pssm`, `compute simplot` | matrices and profiles |
| `draw png`, `draw biojs` | a PNG / an HTML page |
| `build seqboot`, `build distboot`, `build weightboot` | files on disk (see below) |

Everything else — `clean`, `subset`, `subsites`, `trim`, `mask`, `mutate`, `shuffle`, `sort`,
`rename`, `revcomp`, `translate`, `dedup`, `concat`, `append`, `reformat *` — passes an alignment
through and can be followed by another step.

## Flag rules worth knowing

A flag only reaches the command line if it deviates from the CLI's own default: unchecked boxes
disappear, empty text boxes disappear, and a value equal to the upstream default is dropped. That
is why the equivalent command line stays short and why the panel's output is identical to hand
typing. `stringSlice` flags take comma-separated entries.

Format switches belong to the *input* side (`-p`, `-x`, `-u`, `-k`, `--auto-detect`); the *output*
format is chosen by ending the chain with a `reformat <format>` command.

## Presets

The five header buttons, each verified against the embedded binary:

| Preset | Chain |
|---|---|
| Strip gaps then summarize | `clean seqs` → `clean sites --char GAP --cutoff 0` → `stats` |
| Pairwise distance matrix | `compute distance --model k2p --rm-gaps` |
| Alignment heatmap | `draw png` |
| Shorten names and export Phylip | `trim name --nb-char 12` → `reformat phylip` |
| Deduplicate and export Nexus | `dedup` → `reformat nexus` |

A preset replaces the current workflow; the forms are then editable as usual.

## Recipes

Load `samples/demo.fasta` first; every recipe below runs against it unchanged.

### Clean a gappy alignment without losing data you needed

`clean seqs` removes sequences whose gap content exceeds the cutoff, `clean sites` removes
columns. With the default `--cutoff 0.5` nothing is removed until half the alignment is gappy;
`--cutoff 0` removes anything containing at least one gap:

```
clean seqs | clean sites --char GAP --cutoff 0 | stats
```

`clean seqs` and `clean sites` also print `[Warning] ... #seqs after cleaning=7` on stderr while
succeeding. The panel keeps those in the collapsible stderr block, so they do not look like
failures. `clean sites --positions kept.pos` can additionally write the surviving coordinates,
which is what you need to map results back later.

### Keep only the taxa you want

`subset` takes names as bare arguments — the row appears in the form because cobra never
advertises it:

```
subset species_A species_C species_D | stats
```

`--revert` inverts the selection, `--indices` switches the arguments to 0-based positions,
`--regexp --remove-gaps` treats them as patterns.

### Take specific columns

```
subsites 0 1 2 3 4 5 --reverse
```

keeps everything *except* the first six sites. `--informative` selects parsimony-informative
columns instead, `--ref-seq` interprets the coordinates relative to one sequence, `--sitefile`
reads positions from a file.

### Convert formats

```
reformat phylip            # or fasta, nexus, clustal, stockholm, paml, tnt
```

Add `--output-strict` and `--one-line` to shape Phylip output. Converting *from* a non-FASTA
format means telling the first step what it is: `-x` for nexus, `-p` for phylip, or
`--auto-detect` to let GoAlign sniff it.

### Turn an alignment into sequences and back

`unalign` splits the alignment into individual sequences, `transpose` swaps sequences and sites,
`codonalign` / `translate` / `phase` / `phasent` move between nucleotide and amino-acid views,
`orf` extracts open reading frames, `replace stops` handles stop codons.

### Sample and randomise

```
sample sites --length 20 --nsamples 1 --seed 42
shuffle sites | shuffle seqs | mutate gaps --prop-seq 0.05
```

`--seed` makes any of these reproducible; without it GoAlign seeds from the clock. `mutate gaps`
takes the share of *sequences* to touch as `-n, --prop-seq`.

### Distances and profiles

```
compute distance --model k2p --rm-gaps
compute entropy --remove-gaps
```

Both are terminal. `compute distance` writes a phylip-style matrix you can feed to any
distance-based tree builder outside this panel.

### Draw it

```
draw png
```

One row per sequence, one pixel per character — an honest but coarse heatmap, shown inline.
`draw biojs` instead produces a self-contained HTML viewer; save the output and open it in a
browser.

### Combine several alignments

`append` and `concat` both take files as bare arguments:

```
append second.fasta third.fasta
concat second.fasta --out-partition parts.nex
```

`append` stacks sequences; `concat` joins columns for sequences sharing a name, and
`--out-partition` records where each input block ended up.

### When a command writes files instead of stdout

`build seqboot --nboot 100 --out-prefix boot` and the other `build *` commands produce one file
per replicate; so does `sample sites --nsamples 2`. Nothing appears in the result pane because
nothing goes to stdout — that is GoAlign's behaviour, not a panel failure. Give `--output` a real
path (not `stdout`) and look at the folder.

## Reusing a chain outside the panel

Build the chain, press **Copy** next to **Equivalent command line**, and paste it into a terminal.
The only difference is that the panel passes the input through stdin, while the copied line names
the file with `--align` when you used the file mode.
