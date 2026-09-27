# Troubleshooting

## Reading what GoAlign says

A failed step exits with code 1 and writes this to stderr:

```
[Error] in cmd/computedist.go (line 33), message: Unknown model: foo

Usage:
  goalign compute distance [flags]
  ...the entire usage block again...
```

SeqPanel extracts the part after `message:` and shows it as one line on the failed step; the raw
stderr — usage dump included — stays behind **Raw stderr**. If the extracted line is unhelpful,
the raw block almost always contains the flag name that was actually wrong.

Warnings are different: `[Warning] in cmd/cleanseqs.go ... #seqs after cleaning=7` appears on
stderr while the command **succeeded**. The step is green, and it should be.

## The panel will not start or will not reflect

| Symptom | Cause | Fix |
|---|---|---|
| Nothing appears when you double-click the exe | WebView2 Runtime missing on an older Windows 10 | Install the evergreen WebView2 runtime. This is the one external dependency; Tauri cannot avoid it. |
| `Executable not found: ...` | the remembered path is stale (tool moved, drive letter changed) | Press **Use bundled GoAlign**. |
| `Reflecting the command tree failed` | the binary is not a cobra CLI, or it exits non-zero on `__complete` | Reflection needs `__complete` and `--help`; a non-cobra tool cannot be driven. |
| Status line shows an empty version | the CLI was built without its version string injected | Rebuild with `-ldflags "-X github.com/evolbioinfo/goalign/version.Version=v0.4.1"`. |
| You replaced the binary but the tree did not change | the cache is keyed on file name + modification time, and `localStorage` still points at the previously extracted copy | Press **Use bundled GoAlign**, then **Re-reflect commands**. |
| Deleting `%APPDATA%\app.seq.panel` fixed it | corrupted cache or a half-extracted tool | That folder is entirely regenerable — language, theme, paths and cache all reset. |

## "It ran but the result is empty"

The usual cause is a command that writes **files** instead of stdout. `build seqboot`,
`build distboot`, `build weightboot` and `sample sites --nsamples 2` all produce one file per
replicate; `sample sites` with more than one sample derives its file names from `--output`, which
is why leaving `--output` at `stdout` gives odd names like `stdout_0..fa`. Nothing in the result
pane is not a failure — check the folder, and give `--output` a real path.

Also check the step rows: if a step is green but produced nothing, look at its raw stderr.

## "fasta file should start with a >"

GoAlign was handed something that is not the format it assumed. Three ways to hit it:

1. **A terminal command in the middle of the chain.** `stats`, `compute distance`, `draw png` and
   the `build *` commands do not emit an alignment, so anything after them receives a table or a
   PNG as input. End the chain there.
2. **A non-FASTA file read as FASTA.** Add the right switch to the first step — `-p` phylip,
   `-x` nexus, `-u` clustal, `-k` stockholm — or use `--auto-detect`.
3. **Pasted text mode with a header line or trailing blank line.** In paste mode the text goes to
   stdin; make sure it starts with `>`.

`--auto-detect` is the blunt instrument, but note two things: it tries fasta → nexus → phylip →
clustal in that order, and in that mode phylip is treated as *not* strict. If you need strict
phylip, name the format explicitly with `-p --input-strict`.

## Numbers that look wrong

| Symptom | Cause |
|---|---|
| Two runs of the same chain give different alignments | any `sample`, `shuffle`, `random`, `mutate` or `build` command is seeded from the clock unless you set `--seed`. Set one. |
| `clean sites` removed nothing | the default `--cutoff 0.5` only drops columns that are at least 50% the target character. Use `--cutoff 0` to drop any column containing it. |
| `clean seqs` removed a sequence you wanted | same cutoff logic on the sequence side; check the `[Warning]` line that lists what went. |
| `dedup` collapsed sequences you thought were distinct | it compares sequence content, including gaps. `--n-as-gap` treats `N`/`X` as gaps; `--name` deduplicates by name instead. |
| Distances are negative or `NaN` | almost-identical sequences under a correction model, or too few informative sites after cleaning. `--average` gives one number per pair as a sanity check. |
| `translate` output is shifted | `--phase` and `--ref-seq` control the reading frame; the default assumes the alignment starts at a codon boundary. |
| Phylip output names are truncated or rejected downstream | Phylip restricts name length. `trim name --nb-char 10` (or `--auto`) fixes it, and `--out-map` writes the mapping so you can undo it later. |

## Random results are not reproducible

`--seed` is inherited by every command, so set it on the first step of the chain — but note it is
a *per-process* seed. If a chain has two randomised steps, give both of them an explicit seed.

## The drawing is unreadable

`draw png` is one pixel per character by design, so a 300-site alignment is 300 pixels wide and
the panel shows it at that size. It is a pattern overview, not a figure. For a real figure use
`draw biojs` (save the HTML output and open it), or export the alignment and plot it elsewhere.

## Still stuck

Copy the **Equivalent command line** and run it in a terminal. If it fails there too, the issue is
in the CLI invocation, not in the panel — and the same line is what you paste when asking
[upstream](https://github.com/evolbioinfo/goalign/issues).
