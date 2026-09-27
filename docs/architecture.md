# Architecture

This is how Style Dictionary works under the hood.

![build structure](assets/build-diagram.png)

Let's take a closer look into each of these steps.

## 1. Parse the config

Style Dictionary is a configuration based framework, you tell it what to do in a configuration file. Style Dictionary first parses this [configuration](config.md) to know what to do.

## 2. Find all token files

In your [config](config.md) file can define `include` and `source`, which are arrays of file path globs. These tell Style Dictionary where to find your token files. You can have them anywhere and in any folder structure as long as you tell Style Dictionary where to find them.

If there are [custom parsers](parsers.md) defined, Style Dictionary will run those on files the parsers match.

## 3. Deep merge token files

Style Dictionary takes all the files it found and performs a deep merge. This allows you to split your token files in any way you like, without worrying about accidentally overriding groups of tokens. This gives Style Dictionary a single, complete token object to work from.

## 4. Run preprocessors over the dictionary

Allows users to configure [custom preprocessors](preprocessors.md), to process the merged dictionary as a whole, rather than per token file individually.

## 5. Iterate over the platforms

For each platform defined in your [config](config.md), Style Dictionary will do a few steps to get it ready to be consumed on that platform. You don't need to worry about one platform affecting another because everything that happens in a platform is non-destructive.

## 5a. Transform the tokens

Style Dictionary now traverses over the whole token object and looks for design tokens. It does this by looking for anything with a `value` key. When it comes across a design token, it then performs all the [transforms](transforms.md) defined in your [config](config.md) in order.

Value transforms, transforms that modify a token's value, are skipped if the token references another token. Starting in 3.0, you can define a [transitive transform](transforms.md#transitive-transforms) that will transform a value that references another token after that reference has been resolved.

## 5b. Resolve aliases / references to other values

After all the tokens have been transformed, it then does another pass over the token object looking for aliases, which look like `"{size.font.base.value}"`. When it finds these, it then replaces the reference with the transformed value. Because Style Dictionary merges all token files into a single object, aliases can be in any token file and still work.

## 5c. Format the tokens into files

Now all the design tokens are ready to be written to a file. Style Dictionary takes the whole transformed and resolved token object and for each file defined in the platform it [formats](formats.md) the token object and write the output to a file. Internally, Style Dictionary creates a flat array of all the design tokens it finds in addition to the token object. This is how you can output a flat SCSS variables file.

## 5d. Run actions

[Actions](actions.md) are custom code that run in a platform after the files are generated. They are useful for things like copying assets to specific build directories or generating images.

After Style Dictionary does steps 4a-4d for each platform, you will have all your output files that are ready to consume in each platform and codebase.

## Logging

Style Dictionary reports the problems a build runs into instead of failing silently, but keeps the default output bounded: however many problems there are, each category is summarized to its first few occurrences with an `...and N more (M total)` tail. Problems are collected per category — token reference errors, value collisions, output-name collisions, and `outputReferences` warnings for filtered-out tokens — so one noisy category cannot drown out the others. File created / removed / not-created messages are always shown, because they are not problems.

Three options control the output:

- `verbose` expands every category to every occurrence. Reference errors additionally print the reference chain and the token file the broken reference is defined in.
- `silent` suppresses console output entirely; errors are still thrown.
- `log` (`warn` by default, or `error`) decides whether a category is logged as a warning or thrown.

Each can be set at the top level of the config or per platform. Because every token keeps the `filePath` of the token file it was parsed from as it moves through the transform pipeline, a message can name the file a broken reference is defined in without re-reading the sources.
