---
'style-dictionary': minor
---

Build and clean logging now has a single verbosity model, driven by the new `--verbose` and `--silent` CLI flags and matching `verbose`/`silent` config options:

- Reference errors still fail the build, but by default only report how many were found. `--verbose` lists each error with the source file of the token holding the broken reference and the chain of references that led to it.
- Value collisions, output name collisions and filtered `outputReferences` warnings are concise by default: grouped by token/output name with a count and a pointer to `--verbose`. `--verbose` lists every occurrence.
- Files created, files removed and files skipped because they contain no tokens each print a one-line message by default.
- `--silent` suppresses all console output produced by `build` and `clean`, while thrown build failures still surface.
