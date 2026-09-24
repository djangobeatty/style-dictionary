---
'style-dictionary': minor
---

Expand array-valued tokens and properties into indexed item tokens

When `expand` is enabled, array values are now itemized into one token per array item instead of being kept as a single token holding the whole array. This applies both to array-valued properties of composite tokens (e.g. `strokeStyle.dashArray`, `color.components`, `transition.timingFunction`) and to tokens whose own value is an array (e.g. `cubicBezier`).

Each item token holds a single array element as its scalar value, is keyed with its 1-based index (e.g. `{stroke.dashArray.1}`) and uses the type mapped for that property, so per-item transforms apply. Multi-value shadow tokens keep their existing indexed groups, and arrays are left untouched when `expand` is disabled.
