---
'style-dictionary': minor
---

Logging has been redesigned to be more comprehensive and less noisy.

The `log` option now accepts an object instead of a string:

```js
{
  log: {
    warnings: 'warn', // 'warn' | 'error' | 'disabled'
    verbosity: 'default', // 'default' | 'silent' | 'verbose'
    errors: {
      brokenReferences: 'throw', // 'throw' | 'console'
    },
  },
}
```

- Token collisions, broken references and filtered out references now log a concise message by default. Set `log.verbosity` to `verbose` to see every collision/reference in detail.
- `log.warnings: 'error'` throws on warnings instead of logging them, `log.warnings: 'disabled'` silences warnings.
- `log.errors.brokenReferences: 'console'` logs broken references instead of throwing.
- `log.verbosity: 'silent'` disables all logging.
- Broken reference errors now include the file the reference comes from and the reference chain when verbose, making them easier to trace across many token files.
- The CLI accepts `--verbose` and `--silent` flags, which set the verbosity.

The legacy string form (`log: 'warn'` / `log: 'error'`) still works at runtime and is treated as `log.warnings`.
