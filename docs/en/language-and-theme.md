# Language and theme

Both controls sit at the right end of the header. Neither needs a restart, and both choices
survive it.

## Language

Chinese and English are complete, parallel tables of 78 keys in `src/i18n.ts`; the exported
`missingKeys()` helper reports any key present in one table but not the other, which the UI checks
assert on. On first launch with no stored choice the panel follows `navigator.language`, so a
Chinese Windows gets the Chinese interface. The selection is stored under `seqpanel.lang`.

Switching language rebuilds everything that carries translated text: the command tree, the
presets, the parameter forms, the step list, the result pane and the status line.

### What is deliberately not translated

| Text | Source | Why it stays English |
|---|---|---|
| Command ids (`clean sites`, `compute distance`) | the CLI itself | they are arguments, not prose |
| Flag names and types (`--char`, `stringSlice`) | the CLI itself | same reason |
| Flag descriptions, defaults, the whole `--help` prose | the CLI itself | translating it would put words between SeqPanel and upstream that GoAlign never used |
| Statistics tables, distance matrices, alignments | the CLI's stdout | data |
| GoAlign's `[Error] ... message:` text | the CLI's stderr | the panel extracts it verbatim |

What *is* bilingual is everything SeqPanel authors itself, and it carries both languages in the
tool pack (`nameZh`, `descriptionZh`, `labelZh`, `helpZh`): the five preset names and their
descriptions, and the labels for the five commands that read positional arguments.

Backend errors follow the same split. Rust never embeds user-facing prose; it returns
`E#<key>|<detail>`, and the front end renders `E.<key>` from the active table. Adding an error
message means adding one line to each of the two tables, not editing Rust.

## Theme

Three settings — *Follow system*, *Light*, *Dark* — stored under `seqpanel.theme`.

*Follow system* listens for `prefers-color-scheme` changes and reacts live. All three also recolour
the native Windows title bar through the Tauri window API, so the chrome and the client area never
disagree.

Colours come from CSS custom properties on `:root` (`--bg`, `--panel`, `--ink`, `--muted`,
`--line`, `--accent`, `--accent-text`, `--figure-bg`, and their dark overrides). Both palettes are
checked to hold at least 4.5:1 contrast for body text, muted text and the accent fill against its
white label.

One trade-off is visible at start-up. The content security policy is `default-src 'self'` with no
`'unsafe-inline'`, which rules out the inline pre-paint script that would otherwise apply the
stored theme before the first frame. So if you explicitly chose the theme *opposite* to your
system setting, you may see one frame of the system theme before the stylesheet and module load.
Choosing *Follow system* avoids it entirely.

The PNG heatmaps GoAlign draws assume a light page, so the figure background stays white in both
themes and only the chrome around it changes.

## Resetting

Both choices live in `localStorage` for the app's own origin. Deleting the
`app.seq.panel` folder under `%APPDATA%` resets language, theme, the remembered executable path
and the input path, and forces a fresh reflection of the bundled tool.
