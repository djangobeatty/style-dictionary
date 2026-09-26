---
'style-dictionary': minor
---

Redesign console logging to be concise by default, with `--verbose` and `--silent` CLI flags.

- Token reference errors, token collisions and filtered out references now only log a concise summary (how many were found) by default, instead of dumping every single occurrence and flooding the console. Pass `--verbose` (or set `verbose: true` in the config) to see every individual warning.
- Verbose reference errors now include the source file the error comes from and the chain of references that leads to the missing token, making them easier to trace across many token files.
- Added `--silent` (or `silent: true` in the config) to suppress all console output while still building/cleaning.
- Token collisions are now thrown before the file is written when `log` is set to `error`, so a failed build no longer leaves a partially generated file behind.
