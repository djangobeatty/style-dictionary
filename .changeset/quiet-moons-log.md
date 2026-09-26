---
'style-dictionary': minor
---

Redesign build logging: concise by default, detailed with `--verbose`, fully silent with `--silent`.

- Added a `verbosity` option (`'default' | 'silent' | 'verbose'`) to the config.
- Added `--verbose` and `--silent` flags to the `build` and `clean` CLI commands. They take precedence over the `verbosity` set in the config file.
- By default, token value collisions, token name collisions and filtered out `outputReferences` warnings are reported as a single summary per category (a label and a count) instead of listing every occurrence.
- `--verbose` lists every occurrence, and reference errors additionally show the reference chain that failed and the source file(s) of the tokens involved.
- `--silent` suppresses all build and clean output, including platform headers and file created/removed/skipped messages. Errors that fail the build are still thrown, so the process still exits non-zero.
- Reference errors are still fatal and are still reported once after the whole resolution pass, but by default they now state the number of problems found instead of listing each one.
- BREAKING: filtered out `outputReferences` warnings are no longer fatal when `log` is set to `'error'`, they remain warnings in every mode.
