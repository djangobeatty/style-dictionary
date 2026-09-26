---
'style-dictionary': minor
---

Load TypeScript token files (`.ts`, `.mts`, `.cts`) declared in `source`/`include` by importing them as modules, just like `.js`/`.mjs` token files. This requires a runtime that can execute TypeScript natively (Node.js with type stripping, Deno, Bun); on a runtime without it, the build now fails with an error naming the TypeScript file instead of a misleading JSON parse error.
