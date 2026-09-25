---
'style-dictionary': patch
---

Fix reference ordering being ignored when `outputReferences` is combined with DTCG token syntax. `sortByReference` now reads `original.$value` and resolves full-path references (`{colors.red.$value}`) when `usesDtcg` is set, and every built-in format that sorts by reference threads the flag through.
