---
'style-dictionary': patch
---

Fix `undefined` being output by the `javascript/es6` and `typescript/es6-declarations` formats when a token has a comment or `$description` and `commentStyle: "none"` is set. `addComment` now suppresses the comment for `none` instead of concatenating an undefined value.
