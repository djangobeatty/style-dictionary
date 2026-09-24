---
'style-dictionary': patch
---

Treat `/` and `\` as equivalent separators in `platform.buildPath` and file `destination`

Path handling was separator-sensitive: `buildPath` and `destination` were joined with a posix `join()`, which strips a trailing `/` but keeps a trailing `\` as part of the last segment. A `buildPath` like `build\` therefore produced `build\/file.txt`, and normalizing the backslash afterwards turned that into a doubled separator (`build//file.txt`). Directory pruning after a clean had the same problem, since it split and rejoined on `/` only.

`buildPath` and `destination` are now normalized to posix separators before being joined, in both the build (`formatFile`) and clean (`cleanFile`, `cleanDir`) code paths, as well as the `copyAssets` and `androidCopyImages` actions. A config that uses `\` builds and cleans exactly the same paths as the equivalent config that uses `/`, with or without a trailing separator.
