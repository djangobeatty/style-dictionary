---
'style-dictionary': major
---

BREAKING: redesigned logging.

The `log` property of the config (and of a platform config) is now an object:

```js
{
  log: {
    // 'warn' logs warnings, 'error' throws them instead, 'disabled' does neither
    warnings: 'warn',
    // 'default' summarizes, 'verbose' lists every warning/error, 'silent' logs nothing
    verbosity: 'default',
  },
}
```

The old `log: 'warn' | 'error'` notation still works and is a shorthand for `{ warnings: 'warn' | 'error' }`.
A platform's `log` only has to define the properties it deviates on, the rest is inherited from the dictionary.

By default, token collisions, output name collisions and filtered out `outputReferences` are now summarized
rather than listed one by one, which keeps the console readable for dictionaries with many tokens.
Reference errors are summarized the same way, and `verbosity: 'verbose'` lists every single one of them,
including the token file it originates from and the reference chain that led to it.

The CLI gained `-v, --verbose`, `-s, --silent` and `-n, --no-warn` options, which take precedence over the
`log` config. The same overrides can be passed to the constructor:
`new StyleDictionary(config, { verbosity: 'verbose' })`.
