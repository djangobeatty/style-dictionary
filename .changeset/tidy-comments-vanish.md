---
'style-dictionary': patch
---

Fix `javascript/es6` and `typescript/es6-declarations` emitting a literal `undefined` in place of the comment for tokens with a `$description`/`comment` when `formatting.commentStyle` is `none`. Both formats now skip the comment entirely, matching the other built-in formats.
