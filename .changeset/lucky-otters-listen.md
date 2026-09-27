---
'style-dictionary': minor
---

Redesign build logging: concise by default, with verbose and silent modes.

Grouped build problems (token reference errors, value and output-name collisions, filtered
`outputReferences` warnings) are now reported as a concise summary that stays bounded no matter
how many problems a build runs into. Set `verbose: true` in the config, or pass `--verbose` to the
CLI, to expand every group to every occurrence; reference errors then also show the reference chain
and the token file the broken reference is defined in. Set `silent: true`, or pass `--silent`, to
suppress all console output while errors are still thrown.

`verbose` and `silent` can also be set per platform, and an explicitly passed CLI flag wins over the
same key in the config file.
