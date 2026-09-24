---
'style-dictionary': patch
---

Stop the false "filtered out token references were found" warning with `outputReferencesFilter`

When a file combined a `filter` with `options.outputReferences: outputReferencesFilter`, Style Dictionary could print "While building <file>, filtered out token references were found; output may be unexpected" even though the generated file contained no references at all and every value was fully resolved. The warning was a false positive: `outputReferencesFilter` had correctly suppressed the references, but a warning for a filtered-out reference was left behind in the global message collector and was never cleared.

Two leaks caused this:

- The internal reference-safety sort probes references to order tokens. It recurses into the referenced tokens, which can be tokens that the filter excluded from the file. Those tokens are never formatted, so `outputReferencesFilter` never visits them and never clears the warnings the sort recorded for their own references. The sort now only reports filtered-out references for the tokens it is actually ordering, not for the ones it recurses into.
- `outputReferencesFilter` used `.every` to check its references, which short-circuits on the first filtered-out reference, so warnings for any further filtered-out references of the same token were left behind. It now visits every reference.

Genuine cases are unaffected: with `options.outputReferences: true` (or any other truthy value that does not suppress the reference) a filter that excludes referenced tokens still reports the warning, and emitted tokens remain reference-safe ordered.
