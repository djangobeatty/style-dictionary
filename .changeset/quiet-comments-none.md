---
'style-dictionary': patch
---

Fix `addComment` format helper outputting `undefined` when the `commentStyle` formatting option is set to `none`. This affected formats that call `addComment` directly, such as `javascript/es6` and `typescript/es6-declarations`, which no longer append `undefined` after tokens that have a description/comment.
