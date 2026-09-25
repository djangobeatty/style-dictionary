---
'style-dictionary': minor
---

Support TypeScript token files as `source`/`include` globs. `.ts`, `.mts` and `.cts` files are now imported as modules, relying on the native type stripping of the runtime (Node.js, Deno, Bun), so no transpilation step is required.
