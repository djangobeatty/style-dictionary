---
'style-dictionary': minor
---

Redesign logging so the console output stays concise by default:

- Token reference errors, token collisions and filtered-out `outputReferences` warnings now log a concise summary by default. Every individual warning is only shown when running with `--verbose`.
- Reference errors now include the source file the broken reference comes from, as well as the reference chain when the reference was reached through other references, making them easier to trace across many token files.
- Added `--verbose` and `--silent` flags to the CLI. `--silent` disables all logging output, including created/removed file logs.
- The `log` config option now also accepts an object to configure this behavior, e.g. `log: { warnings: 'error', verbosity: 'verbose' }`. The existing shorthand `log: 'warn' | 'error'` still works, and `warnings: 'error'` throws the warnings as errors.
