---
title: Transform Groups
sidebar:
  label: Overview
---

Transform Groups are a way to easily use multiple transforms at once as a collection or group.
They are an array of transforms. You can define a custom transform group with the [`registerTransformGroup`](/reference/api#registertransformgroup).

You use transformGroups in your config file under `platforms` > `[platform]` > `transformGroup`

```json title="config.json"
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transformGroup": "android"
    }
  }
}
```

## Combining with transforms

You can also combine transforms with transformGroup:

```json title="config.json"
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transformGroup": "android",
      "transforms": ["name/snake"]
    }
  }
}
```

The transforms that are standalone will be added **after** the ones inside the transformGroup.
If it's important to determine the order of these yourself, you can always register a custom transformGroup to have more granular control.

## Reading the contents of a built-in transform group

The contents of the built-in transform groups are part of the public API, so you don't have to copy
a built-in group's transform list by hand to tweak it. `getTransformGroup` from
`style-dictionary/enums` takes a built-in group name and returns its transforms as an ordered array
of transform names, exactly the transforms Style Dictionary applies when that group is used as
`transformGroup` in a platform config.

That means you can take a built-in group, filter out the transforms you don't want, and register the
remainder as a custom transform group. Because the list comes from the built-in definition itself, it
stays up to date when Style Dictionary changes a built-in group.

```js title="build-tokens.js"
import StyleDictionary from 'style-dictionary';
import { getTransformGroup, transformGroups, transforms } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      // uses the custom group registered below
      transformGroup: 'css-minus-time',
      buildPath: 'build/',
      files: [{ destination: 'variables.css', format: 'css/variables' }],
    },
  },
});

// the built-in `css` group, without the `time/seconds` transform
const cssTransforms = getTransformGroup(transformGroups.css).filter(
  (transform) => transform !== transforms.timeSeconds,
);

sd.registerTransformGroup({
  name: 'css-minus-time',
  transforms: cssTransforms,
});

await sd.buildAllPlatforms();
```

You can also list the group names via the [`transformGroups`](/reference/enums) enum, and the
transform names via the [`transforms`](/reference/enums) enum.
