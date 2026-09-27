---
'style-dictionary': minor
---

Redesign build logging with verbosity levels. The `log` option now accepts `{ warnings: 'warn' | 'error', verbosity: 'silent' | 'default' | 'verbose' }`, also selectable from the CLI with `--verbose` and `--silent`. Noisy warning categories (reference errors, token name collisions, filtered out output references and source value collisions) are summarised by default and listed in full when verbose. Reference errors are warnings now, they only throw when warnings are set to error. Verbose reference errors name the token file each token involved was defined in, for missing references and circular reference cycles alike. Passing `log` as the string `'warn'` or `'error'` still works, it is shorthand for the warnings level.
