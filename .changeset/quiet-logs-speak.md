---
'style-dictionary': minor
---

Redesign logging to be less verbose by default and easier to configure.

The `log` option now accepts an object with a `warnings` and a `verbosity` setting, either globally or per platform:

```json
{
  "log": {
    "warnings": "warn",
    "verbosity": "default"
  }
}
```

- `warnings`: `warn` (default) logs warnings, `error` throws them, `disabled` ignores them.
- `verbosity`: `default` logs concise summaries, `verbose` logs the full detail of every warning, `silent` logs nothing at all.

A platform's `log` is merged onto the global one field by field, so a platform only overrides what it sets, and the CLI `--verbose`/`--silent` flags apply on top of the global config the same way.

For backwards compatibility, `log` still accepts a shorthand string: `'warn'`, `'error'` or `'disabled'` sets the `warnings` level, and `'default'`, `'verbose'` or `'silent'` sets the `verbosity`.

Token collisions, filtered out references and reference errors are now summarized in a single concise message by default, so large dictionaries no longer flood the console. Use `verbosity: 'verbose'` to see every warning individually. Verbose reference errors now also report the file the broken reference comes from and the chain of references that led to it.

The CLI gained `--verbose` and `--silent` flags on the `build` and `clean` commands, which set the verbosity for that run.
