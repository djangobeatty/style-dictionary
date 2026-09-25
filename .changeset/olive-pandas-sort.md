---
'style-dictionary': patch
---

Fix `sortByReference` when using the DTCG format: tokens with `outputReferences` enabled are now sorted so a reference is never used before it is defined, just like in the regular format.
