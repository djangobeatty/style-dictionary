---
'style-dictionary': minor
---

Add a built-in `markdown/tables` format

Style Dictionary shipped formats for CSS, SCSS, Less, Stylus, JS/TS, JSON, Android, iOS, Compose, Flutter and Sketch, but nothing that produced Markdown, so teams keeping token documentation in Markdown had to hand-roll the output with `registerFormat`.

`markdown/tables` writes a single Markdown table with a header row, a delimiter row and one data row per token in the file's dictionary (tokens excluded by the file's `filter` are omitted). By default each row shows the token name, its resolved value and its type — DTCG tokens read `$value`/`$type` and legacy tokens read `value`/`type` — and references are resolved, so a documentation table stays in sync with the built tokens instead of showing the raw `{...}` reference.

The columns are configurable per file through `options.columns`, where each entry is either a token property name or an object with a `property` and a `header` label, so columns can reference properties beyond name/value/type (e.g. `comment`) and be reordered or relabelled. Composite values (shadow, typography, etc.) render as a string rather than `[object Object]`, and pipes or line breaks in a name or value are escaped so they cannot split a row or terminate the table.

The format is selectable by its string name in a config or through the `formats.markdownTables` enum.
