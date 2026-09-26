# Architecture

Notes on the constraints that shape the code in `lib/`. This is for contributors; user-facing documentation lives in `docs/src/content/docs/` and on [styledictionary.com](https://styledictionary.com).

## `lib/` runs in the browser as well as in Node

Style Dictionary ships as a browser-capable library, so nothing in `lib/` may assume Node. The rules that follow from that:

- **Guard Node-only branches with `isNode`** (`lib/utils/isNode.js`, `typeof window === 'undefined'`). Windows path handling, `process`, and `Buffer` all sit behind it.
- **Never import `node:fs` in `lib/`.** Filesystem access goes through the volume passed down from `StyleDictionary` (`this.volume`, the `vol` parameter), falling back to the shim in `lib/fs.js`. `lib/fs-node.js` is the Node entry point, selected through the `node` export condition on `style-dictionary/fs`.
- **Resolve paths with `resolve(filePath, vol?.__custom_fs__)`** from `lib/resolve.js`, not with `path.resolve`. The `__custom_fs__` flag tells it whether the path is relative to the working directory (Node) or to the volume root (browser / custom FS).
- **Glob results differ by environment.** In the browser they carry a leading slash that has to be stripped; stripping it in Node would break absolute paths.

## Loading config and token files

Two separate code paths decide how a file on disk becomes an object:

- **Config files** — `lib/StyleDictionary.js`, when `config` is a string path.
- **Token files** matched by the `source` / `include` globs — `lib/utils/combineJSON.js`.

For token files the decision order is:

1. **Registered custom parsers run first.** A parser whose `pattern` matches the path wins over the extension dispatch entirely, which is what lets users take over loading for any extension — including ones that are supported natively. A parser only runs if it is also applied by name in the platform's `parsers` array.
2. **Otherwise the extension decides.** Extensions on the module lists are dynamically imported and their `default` export is used; everything else is read as text and handed to JSON5.

Things worth knowing before changing either path:

- `.json`, `.json5` and `.jsonc` are all parsed by JSON5, so comments, trailing commas and unquoted keys work in all three regardless of the extension.
- The two paths use opposite defaults and drift apart easily: the config path imports anything that is _not_ JSON-ish, while the token path imports only what is on an explicit allowlist. Adding support for an extension in one place is not enough — check whether the other needs it too, and whether the docs describe both.
- Anything loaded through `import()` executes on whatever runtime the user has. Extensions needing more than plain ES-module support (TypeScript, for one) work on runtimes that provide it and fail on those that don't. The failure arrives as an ordinary import error, so the `catch` has to translate it into a message that names the file and the real cause — a raw parse error there sends people looking in the wrong place.
