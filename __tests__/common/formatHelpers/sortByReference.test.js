/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
import { expect } from 'chai';
import sortByReference from '../../../lib/common/formatHelpers/sortByReference.js';
import flattenTokens from '../../../lib/utils/flattenTokens.js';

const tokens = {
  colors: {
    red: {
      name: 'colors-red',
      path: ['colors', 'red'],
      value: '#ff0000',
      original: {
        value: '#ff0000',
        type: 'color',
      },
      type: 'color',
    },
    primary: {
      name: 'colors-primary',
      path: ['colors', 'primary'],
      value: '#ff0000',
      original: {
        value: '{colors.red}',
        type: 'color',
      },
      type: 'color',
    },
    accent: {
      name: 'colors-accent',
      path: ['colors', 'accent'],
      value: '#ff0000',
      original: {
        value: '{colors.primary}',
        type: 'color',
      },
      type: 'color',
    },
  },
};

const dtcgTokens = {
  colors: {
    red: {
      name: 'colors-red',
      path: ['colors', 'red'],
      $value: '#ff0000',
      original: {
        $value: '#ff0000',
        $type: 'color',
      },
    },
    primary: {
      name: 'colors-primary',
      path: ['colors', 'primary'],
      $value: '#ff0000',
      original: {
        $value: '{colors.red}',
        $type: 'color',
      },
    },
    accent: {
      name: 'colors-accent',
      path: ['colors', 'accent'],
      $value: '#ff0000',
      original: {
        $value: '{colors.primary}',
        $type: 'color',
      },
    },
  },
};

// token with multiple references, where one of its references (spacing-other)
// references the other one (spacing-base) as well
const multiRefTokens = {
  spacing: {
    combined: {
      name: 'spacing-combined',
      path: ['spacing', 'combined'],
      value: '5px 10px',
      original: {
        value: '{spacing.base} {spacing.other}',
        type: 'dimension',
      },
      type: 'dimension',
    },
    other: {
      name: 'spacing-other',
      path: ['spacing', 'other'],
      value: '10px',
      original: {
        value: '{spacing.base}',
        type: 'dimension',
      },
      type: 'dimension',
    },
    base: {
      name: 'spacing-base',
      path: ['spacing', 'base'],
      value: '5px',
      original: {
        value: '5px',
        type: 'dimension',
      },
      type: 'dimension',
    },
  },
};

const dtcgMultiRefTokens = {
  spacing: {
    combined: {
      name: 'spacing-combined',
      path: ['spacing', 'combined'],
      $value: '5px 10px',
      original: {
        $value: '{spacing.base} {spacing.other}',
        $type: 'dimension',
      },
    },
    other: {
      name: 'spacing-other',
      path: ['spacing', 'other'],
      $value: '10px',
      original: {
        $value: '{spacing.base}',
        $type: 'dimension',
      },
    },
    base: {
      name: 'spacing-base',
      path: ['spacing', 'base'],
      $value: '5px',
      original: {
        $value: '5px',
        $type: 'dimension',
      },
    },
  },
};

const permutations = (arr) =>
  arr.length <= 1
    ? [arr]
    : arr.flatMap((item, index) =>
        permutations([...arr.slice(0, index), ...arr.slice(index + 1)]).map((rest) => [
          item,
          ...rest,
        ]),
      );

// sorts every possible input order of the flattened tokens, the result
// should always be the same: references come after the tokens they reference
const sortedNames = (tokens, opts) => {
  const allTokens = flattenTokens(tokens, opts?.usesDtcg);
  return permutations(allTokens).map((permutation) =>
    [...permutation].sort(sortByReference(tokens, opts)).map((token) => token.name),
  );
};

describe('common', () => {
  describe('formatHelpers', () => {
    describe('sortByReference', () => {
      it('should not sort a reference before the token it references', () => {
        for (const names of sortedNames(tokens)) {
          expect(names).to.deep.equal(['colors-red', 'colors-primary', 'colors-accent']);
        }
      });

      it('should not sort a reference before the token it references when using DTCG syntax', () => {
        for (const names of sortedNames(dtcgTokens, { usesDtcg: true })) {
          expect(names).to.deep.equal(['colors-red', 'colors-primary', 'colors-accent']);
        }
      });

      it('should not sort a token before tokens it references when it has multiple references', () => {
        for (const names of sortedNames(multiRefTokens)) {
          expect(names).to.deep.equal(['spacing-base', 'spacing-other', 'spacing-combined']);
        }
      });

      it('should not sort a token before tokens it references when it has multiple references and uses DTCG syntax', () => {
        for (const names of sortedNames(dtcgMultiRefTokens, { usesDtcg: true })) {
          expect(names).to.deep.equal(['spacing-base', 'spacing-other', 'spacing-combined']);
        }
      });
    });
  });
});
