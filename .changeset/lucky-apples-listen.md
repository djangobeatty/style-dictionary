---
'style-dictionary': minor
---

Support TypeScript (`.ts`, `.mts`) design token files, by loading them as modules rather than attempting to parse them as JSON. This requires a runtime that handles TypeScript natively, e.g. Deno, Bun or Node with type stripping. TypeScript config files were already supported.
