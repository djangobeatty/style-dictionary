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

## Package Manager and dependencies

We use npm as our package manager. After downloading the repo, please use the command "npm ci" to ensure you use the package-lock dependency tree. Note that you need NPM 5.7.0 or higher to use this command.

## Code Style

We use ESLint on the code to ensure a consistent style. Any new code committed must pass our ESLint tests. Take a look at our [ESLint file][eslint].

### Code Rules

1. **Do not mutate token names or values in a format.** Mutations like this should happen in a transform.
1. **Be as generic as possible.** Do not hard-code any values or configuration in formats.
1. **Fail loudly.** Users should be aware if something is missing or configurations aren't correct. This will help debug any issues instead of failing silently.
1. **Rely on few dependencies.** This framework is meant to be extended and allows for customization. We don't want to bring a slew of dependencies that most people don't need.
1. **Handle both token syntaxes.** See [Supporting DTCG and v3 token syntax](#supporting-dtcg-and-v3-token-syntax).

### Supporting DTCG and v3 token syntax

A token's value and type live under `value`/`type` in v3 syntax and under `$value`/`$type` in DTCG syntax. Which one applies is carried at runtime by the boolean `usesDtcg` flag, which is exposed on format `options` and threaded explicitly through the utils and format helpers.

1. **Never read `value`, `type`, `original.value`, or `original.$value` directly.** Branch on `usesDtcg` at the point of access, e.g. `usesDtcg ? token.original?.$value : token.original?.value`. A hard-coded read silently yields `undefined` for half of all users, and most downstream predicates treat `undefined` as a benign "no", so the failure is a wrong result rather than an error.
1. **Thread `usesDtcg` through every call.** A helper that accepts the flag is useless if its caller drops it. When adding a call to a util or format helper that takes `usesDtcg`, pass it — `options` in a format body almost always already has it in scope. DTCG references can be written in full-path form (`{colors.red.$value}`), and reference resolution only strips the `.$value` suffix when the flag is set.
1. **Test both syntaxes.** A fix verified only against v3 tokens does not demonstrate DTCG behaviour, and vice versa. The expected result for an equivalent token set is identical output in both syntaxes; assert that equivalence rather than just the one you were debugging.

### Commit Rules

We follow [conventional commits'](https://www.conventionalcommits.org/en/v1.0.0-beta.2/#specification) specification.

Please follow the spec to have a successful commit.

### Changesets

Any change that users can observe — a bug fix, a new transform/format, a type change — needs a changeset. Run `npx changeset` and describe the change from the user's point of view; it lands as a new file in `.changeset/` and feeds the release notes. Changes with no user-visible effect (internal refactors, test-only changes, CI) don't need one.

### Do not commit release-time artifacts

`npm run build` is part of the release (`npm run release`), not a local development step. Running it rewrites files in place and `git add`s them, so it is easy to commit release machinery by accident. Before committing, check `git status`/`git diff` for:

- **`lib/StyleDictionary.js`'s version placeholder.** `static VERSION` holds the literal sentinel `'<? version placeholder ?>'`, which `scripts/inject-version.js` substitutes at publish time. If a resolved version number is committed, the substitution becomes a permanent no-op and every future release reports a stale `VERSION` — silently, since nothing fails.
- **`examples/*/*/package.json` dependency ranges.** The same script bumps the `style-dictionary` devDependency in every example to the version being released. Those bumps belong to the release commit.
- **Generated `.d.ts` files.** `tsc --emitDeclarationOnly` writes declarations next to their `lib/**/*.js` sources. They are build output; only hand-written declarations (`types/`, `docs/src/env.d.ts`) are tracked.

To type-check without emitting, use `npm run lint:types` (`tsc --noEmit`).

## What should be included?

Anything that contributes to the idea of creating cross-platform styles.

### What transforms/transform groups/formats should be included?

If it has a generic and flexible enough use-case, it can be included. We would like to keep this type of code to a minimum because we don't want to be a swiss army knife that does everything out of the box. Instead, we want to focus on core tasks that are useful to the largest number of projects. The spirit of this framework is to allow flexibility and modularity which helps anyone fit it to their needs. This is why you can write your own transforms, and formats with the register methods.

### Where do things go?

We separate each function/method into its own file and group them into directories. The times we break that is for transforms and formats, but we might change that in the future. Keep the files/methods as self-contained as possible, they should each do one task.

## Testing

Any new features should implement the proper unit tests. Tests are written with Mocha and Chai, and run two ways:

- `npm test` runs the suite in a browser via [@web/test-runner](https://modern-web.dev/docs/test-runner/overview/), with coverage.
- `npm run test:node` runs the unit, integration, and node-only suites under Mocha. This is the fastest full check while developing.

Run `npm run lint` as well; it covers ESLint, Prettier, and `tsc --noEmit`.

If you are adding a new transform, action, or format: please add new unit tests. You can see examples in **\_\_tests\_\_**/formats.

When fixing a bug, prefer an assertion on the exact output string over a looser structural check. Many defects here — ordering, formatting, reference resolution — produce output that is still well-formed and only wrong in its detail, so a structural assertion passes on broken output.

## Documentation

We use [Astro](https://astro.build/) to transform the markdown files into a documentation website. To preview it locally, run `npm run docs:start`.

[issues]: https://github.com/amzn/style-dictionary/issues
[license]: https://github.com/amzn/style-dictionary/blob/main/LICENSE
[cla]: http://en.wikipedia.org/wiki/Contributor_License_Agreement
[eslint]: https://github.com/amzn/style-dictionary/blob/main/.eslintrc.json
