---
'style-dictionary': minor
---

Expose the contents of the built-in transform groups through the public API

The mapping of a built-in transform group to the ordered transforms it contains was internal only. `style-dictionary/enums` exported the group names (`transformGroups`) and the transform names (`transforms`), but nothing said which transforms belonged to which group, so tweaking a built-in group meant copying its whole list by hand and keeping it in sync across releases.

`getTransformGroup` is now exported from `style-dictionary/enums`. It takes a built-in group name and returns its transforms as an ordered array of transform names, read from the same definition the runtime applies for `transformGroup`, so it does not drift when a built-in group changes:

```js
import { getTransformGroup, transformGroups, transforms } from 'style-dictionary/enums';

const cssTransforms = getTransformGroup(transformGroups.css).filter(
  (transform) => transform !== transforms.timeSeconds,
);

sd.registerTransformGroup({ name: 'css-minus-time', transforms: cssTransforms });
```

The returned array is a copy, so callers cannot mutate the built-in definitions. Passing a name that is not a built-in transform group throws.
