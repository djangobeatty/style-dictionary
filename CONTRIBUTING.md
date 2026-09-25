# Contributing to the Style Dictionary

This is a labor of love, and we work hard to provide a useful framework. We greatly value feedback and contributions from our community. Whether it's a bug report, new feature, correction, or additional documentation, we welcome your issues and pull requests. Please read through this document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your bug report or contribution.

## Filing Bug Reports

You can file bug reports on the [GitHub issues][issues] page.

If you are filing a report for a bug or regression in the framework, it's extremely helpful to provide as much information as possible when opening the original issue. This helps us reproduce and investigate the possible bug without having to wait for this extra information to be provided. Please read the following guidelines prior to filing a bug report.

1. Search through existing [issues][issues] to ensure that your specific issue has not yet been reported. If it is a common issue, it is likely there is already a bug report for your problem.
2. Ensure that you have tested the latest version of the framework. Although you may have an issue against an older version of the framework, we cannot provide bug fixes for old versions. It's also possible that the bug may have been fixed in the latest release.
3. Provide as much information about your environment, npm version, and relevant dependencies as possible. For example, let us know what version of Node.js you are using, what other node modules, what ES version, etc. If possible, send us a github repository we can take a look at.
4. Provide a minimal test case that reproduces your issue or any error information you related to your problem. We can provide feedback much more quickly if we know what operations you are calling in the framework. If you cannot provide a full test case, provide as much code as you can to help us diagnose the problem. Any relevant information should be provided as well, like whether this is a persistent issue, or if it only occurs some of the time.

## Submitting Pull Requests

We are always happy to receive code and documentation contributions to the framework. Please be aware of the following notes prior to opening a pull request:

1. This framework is released under the [Apache license][license]. Any code you submit will be released under that license. For substantial contributions, we may ask you to sign a [Contributor License Agreement (CLA)][cla].
2. For any significant features or API changes please reach out to us to avoid any duplicate effort.
3. Adding to the included transforms, transformGroups, and formats, please read [this section](#what-should-be-included).
4. Any change that affects released behavior ships a [changeset](https://github.com/changesets/changesets) entry. Add a `.changeset/*.md` file alongside the code, describing the behavior change and why it matters to consumers — the release changelog is generated from these.

## Package Manager and dependencies

We use npm as our package manager. After downloading the repo, please use the command "npm ci" to ensure you use the package-lock dependency tree. Note that you need NPM 5.7.0 or higher to use this command.

## Code Style

We use ESLint on the code to ensure a consistent style. Any new code committed must pass our ESLint tests. Take a look at our [ESLint file][eslint].

Run `npm run lint` before opening a PR: it runs ESLint, Prettier and `tsc --noEmit` (`lint:types`). The last one type-checks the JS sources via `checkJs` and `strict`, so JSDoc annotations are enforced — keep them accurate (for example, `JSON.stringify` returns `string | undefined`, not `string`).

### Code Rules

1. **Do not mutate token names or values in a format.** Mutations like this should happen in a transform.
1. **Never build an output string literal by escaping a token value.** Token values are arbitrary user text, and escaping a subset of characters (quotes, say) leaves the rest — backslashes, newlines, line separators — free to terminate the literal and break out of the surrounding declaration. If an output syntax needs a value wrapped, gate on an allowlist instead: wrap only values that provably cannot contain a character that breaks out (for example the base64 alphabet), and emit every other value verbatim. Then there is no escaping step to get wrong.
1. **When a markup target forces escaping, escape the escape character first.** Some syntaxes have no allowlist that keeps a value safe — a Markdown table cell has to accept arbitrary text, so `|` and line breaks are escaped rather than wrapped. That is not a string literal, so it does not contradict the rule above, but the escape must be complete: markdown-family syntaxes read backslash escapes by parity, so a literal `\` in the value turns an escaped `\|` into `\\|` — a literal backslash followed by a live delimiter. Escape `\` before the character it could escape, and only document a guarantee like "a value can never split a row" once the escape actually provides it.
1. **Treat token values as untrusted, verbatim input.** Style Dictionary does not sanitize or escape values for the target syntax; the value itself is the trust boundary, and any token type can carry text that splits a declaration. If a format-level adaptation is unavoidable, gate it on the specific output format and make it a no-op for every value it cannot prove safe — and prefer a transform when all outputs must agree, since formats that inline values directly (rather than through a shared helper) will not apply it.
1. **Never hand back a token structure that aliases your input.** Utilities that return tokens — `flattenTokens`, `convertTokenData`, and the dictionary's `tokens`/`allTokens`/`tokenMap` views — are pure: they must not modify the input, and every token they emit must be a full `structuredClone`, so that mutating a returned token's nested sub-properties (an object-valued `value`, `attributes`, `original`, `path`) cannot leak back into the input, and mutating the input after a call cannot retroactively change results already returned. A shallow spread (`{ ...token }`) or reusing the input reference only copies the top level and still shares nested objects and arrays, so it does not satisfy this. Because each view is cloned independently, do not rely on object identity to carry state between `tokens`, `allTokens` and `tokenMap` — look tokens up by key or path.
1. **Be as generic as possible.** Do not hard-code any values or configuration in formats.
1. **Normalize path separators before joining.** Style Dictionary's canonical internal form is posix. User-supplied paths (`platform.buildPath`, file `destination`, asset paths) accept either `/` or `\` and must be joined with the shared helpers in `lib/utils/joinPath.js` (`joinPath`, `normalizeSeparators`) rather than a bare posix `join()`. A posix `join()` keeps a trailing `\` as part of the last segment — `join('build\\', 'file.txt')` gives `build\/file.txt` — so normalizing afterwards turns it into a doubled separator. Normalizing first makes the trailing separator optional and makes `\` and `/` configs produce identical paths, in the log as well as on disk. Build and clean must derive destinations the same way: `cleanFile`/`cleanDir` can only prune what the build path actually wrote.
1. **Fail loudly.** Users should be aware if something is missing or configurations aren't correct. This will help debug any issues instead of failing silently. A present-but-malformed option is a configuration error, not a missing value: silently substituting the default hides the mistake, and letting a raw `TypeError` escape from deep inside the format is not actionable either. Normalize and validate option shapes at the boundary — coerce where there is exactly one sensible reading, and throw a clear error where there is not.
1. **Never record a warning for a reference you are not emitting.** Filtered-out-reference warnings are collected in the collector of the file being formatted — `dictionary.filteredReferences`, one per file so that concurrently formatted siblings cannot drain each other's messages — and a warning must not outlive the reference it describes. Any lookup that merely inspects tokens — reference-safe ordering, or an `outputReferences` predicate deciding whether to emit — must pass `recordWarnings: false` to `getReferences`; a token that is never formatted never clears the warning it recorded, so the leftover warning is reported as a false positive for the whole file.
1. **Scope state to the file or platform that owns it, never to module scope.** `formatPlatform` formats a platform's files concurrently (`Promise.all`), and `formatAllPlatforms` does the same across platforms, so anything recorded during formatting that has to be attributed to one file or platform cannot live in process-wide state: whichever concurrent task reads it first takes whatever its siblings wrote into it, and the attribution flips when unrelated async timing changes (a sibling gaining a filter adds ticks, for example). `lib/utils/groupMessages.js` exports a singleton instance of `GroupMessages`; a key on it must be scoped per file — the pattern `PropertyNameCollisionWarnings` uses, appending `:${destination}` — or, better, take a fresh instance from the exported class (`GroupMessageCollector`) so no other file can reach those messages. State that belongs to one file can also ride on that file's dictionary; attach it with `Object.defineProperty` and no `enumerable`, so it stays out of the dictionary that formats serialize, and remember that a format which shallow-copies its dictionary (`{...dictionary}`) then loses it.
1. **Match references against an immutable value, never against the output you are building.** An object/array-valued token (shadow, border, typography, gradient) is already flattened to a string by the time references are rewritten, so each reference has to be found by matching its resolved value in that string. Take a snapshot of the value before any replacement, find every reference's occurrence in the snapshot, and apply the replacements afterwards from the highest index down — do not search the string you are rewriting. Replacement text can contain the matched value (`var(--ref, 0)` when fallbacks are enabled), so a later reference that resolves to the same value would match inside the fallback just emitted for an earlier one and nest there instead of landing in its own slot. Resolved values are not unique keys — several references commonly resolve to the same string — so each occurrence may be claimed by only one reference, and every reference keeps its own slot at its own position.
1. **Expose internals through a public entry point, never an internal file path.** The package's public surface is the `exports` map in `package.json` (`style-dictionary`, `style-dictionary/enums`, `style-dictionary/utils`, `style-dictionary/types`); a module under `lib/` that no entry point re-exports is internal, and consumers cannot reach it without importing a path into the package. When the runtime already holds data a consumer needs to read — the contents of the built-in transform groups, say — re-export an accessor from the matching public entry point rather than leaving them to copy the value by hand or import the internal module. The accessor must read the same definition the runtime uses (the live registry, not a second hand-maintained literal, which would drift as built-ins change) and hand back a copy, so callers cannot mutate the source of truth.
1. **Look up a caller-supplied key as an own property.** A lookup table is a plain object, so `table[key]` also resolves inherited `Object.prototype` members: an unknown name like `toString`, `constructor`, or `hasOwnProperty` passes an `if (!table[key])` guard, and the failure then surfaces as a confusing downstream `TypeError` instead of the intended "unknown …" error. Guard with `Object.hasOwn` — the idiom used throughout `lib/` — or build the table with `Object.create(null)` for the same reason `convertTokenData` does, so only real entries are ever found.
1. **Import the leaf module, not the barrel, when the barrel re-exports you.** If an entry point like `lib/enums/index.js` re-exports a module, that module must not import the barrel for the values it needs — that is a circular import. Import the leaf module directly (`../enums/transforms.js`, not `../enums/index.js`), and keep the entry point's own imports one-directional.
1. **Rely on few dependencies.** This framework is meant to be extended and allows for customization. We don't want to bring a slew of dependencies that most people don't need.

### Commit Rules

We follow [conventional commits'](https://www.conventionalcommits.org/en/v1.0.0-beta.2/#specification) specification.

Please follow the spec to have a successful commit.

## What should be included?

Anything that contributes to the idea of creating cross-platform styles.

### What transforms/transform groups/formats should be included?

If it has a generic and flexible enough use-case, it can be included. We would like to keep this type of code to a minimum because we don't want to be a swiss army knife that does everything out of the box. Instead, we want to focus on core tasks that are useful to the largest number of projects. The spirit of this framework is to allow flexibility and modularity which helps anyone fit it to their needs. This is why you can write your own transforms, and formats with the register methods.

### Where do things go?

We separate each function/method into its own file and group them into directories. The times we break that is for transforms and formats, but we might change that in the future. Keep the files/methods as self-contained as possible, they should each do one task.

## Testing

Any new features should implement the proper unit tests. We use Jest to test our framework.

If you are adding a new transform, action, or format: please add new unit tests. You can see examples in **\_\_tests\_\_**/formats.

## Documentation

We use [Astro](https://astro.build/) to transform the markdown files into a documentation website. To preview it locally, run `npm run docs:start`.

The "List of Enums" section of the enums reference page is generated from the sources by `docs/src/remark-enums.js`, which scans `lib/enums/index.js` for `export { … } from './x.js'` lines and inlines each matched module verbatim. A re-export whose path is not `'./…'` (or that is not a single-line named re-export) is silently omitted from that list — document it by hand if it needs to appear.

### Documentation Rules

1. **Docs that describe a starter are a mirror of its example directory.** `style-dictionary init <type>` does a verbatim `cpSync` of `examples/<type>` into the working directory and then builds it. So `docs/src/content/docs/getting-started/installation.mdx` is a description of `examples/basic`, and `docs/src/content/docs/examples/basic.mdx` documents that same directory. Changing an example — its token files, its `config.json` platforms, the artifacts it emits — invalidates every page that quotes it; update the docs in the same change. A guide that points the reader at a file the example does not contain is broken even if every other line is right.
1. **Verify quoted output by running the command, not by reading the config.** Reproduce in a clean temp dir before writing or editing the sample blocks: run the command, capture stdout byte-for-byte, list the generated tree, and dump each artifact. Then paste from that. Every path, filename, token name, sample value, and platform name/count in the page must match what the tool actually writes — the config tells you what _should_ be emitted, not what the current code emits, and the two drift silently.
1. **Mark excerpts as excerpts.** A sample block that drops lines reads as a complete file to anyone who has not seen the real one. If you show a subset — a few rows of a generated XML/Kotlin/CSS file — add an elision marker (`…`) or show the file whole. The old version of a page showing a file complete is not a reason to leave a silent truncation in the new one.

[issues]: https://github.com/style-dictionary/style-dictionary/issues
[license]: https://github.com/style-dictionary/style-dictionary/blob/main/LICENSE
[cla]: http://en.wikipedia.org/wiki/Contributor_License_Agreement
[eslint]: https://github.com/style-dictionary/style-dictionary/blob/main/eslint.config.js
