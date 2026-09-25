---
'style-dictionary': patch
---

Fix `sortByReference` so that `outputReferences` no longer emits references before their definitions. The helper read `token.original.value`, which is `undefined` in DTCG syntax, so every comparison took the same branch. It also returned `-1` for tokens that do not reference one another, which reversed the token order rather than keeping it. Tokens are now kept in their original order unless a reference requires them to move, in both the default and DTCG syntax.
