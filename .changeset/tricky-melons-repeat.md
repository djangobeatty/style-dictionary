---
'style-dictionary': patch
---

Fix `javascript/es6` and `typescript/es6-declarations` formats outputting `undefined` for tokens with comments when `commentStyle: "none"` is set. `addComment` now suppresses the comment instead of concatenating `undefined` into the output.
