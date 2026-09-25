---
'style-dictionary': patch
---

Attribute the "filtered out token references were found" warning to the file that filtered them

When a platform built more than one file, the warning could be reported against the wrong file. Filtered-out reference warnings were collected in a single shared message group, while a platform's files — and the platforms themselves — are formatted concurrently. Whichever file resumed after `await format(...)` first read and flushed that group picked up the warnings recorded by its siblings, so the warning flipped to a different file whenever unrelated timing changed (for example when a sibling file gained a filter).

`formatFile` now creates a warning collector for the file it is formatting and passes it along on the dictionary as `dictionary.filteredReferences`. The format helpers that resolve references (`createPropertyFormatter`, `formattedVariables`/`sortByReference`, `outputReferencesFilter`) record into it, and `formatFile` reports only that collector. A file therefore can only ever report warnings it recorded itself: a file that filtered out no referenced token logs success even when a sibling warns, the listed references are exactly the ones that file's own filter excluded, and the attribution no longer depends on which file or platform finishes formatting first. Nothing is registered in process-wide state, so nothing accumulates across builds either.

`outputReferencesFilter` no longer records a warning for references it is about to suppress, since that warning was always removed again immediately — it is a lookup that decides whether a reference may be emitted, not one that emits it.

Custom formats that resolve references themselves can pass `dictionary.filteredReferences` to `getReferences` (or `sortByReference`) to get the same per-file attribution. Without it there is no file to report a warning for, so `getReferences` prints the warning right away instead of parking it in a queue that any concurrently formatted file could drain.
