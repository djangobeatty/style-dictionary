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
import StyleDictionary from 'style-dictionary';
import { restore, stubMethod } from 'hanbi';
import { sortByReference } from 'style-dictionary/utils';

/**
 * brand -> primary -> red, declared in an order that is neither the correct
 * dependency order nor its reverse, so the helper has to do real work.
 */
const dtcgTokens = {
  colors: {
    primary: { $value: '{colors.red}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
    brand: { $value: '{colors.primary}', $type: 'color' },
  },
};

const v3Tokens = {
  colors: {
    primary: { value: '{colors.red}', type: 'color' },
    red: { value: '#ff0000', type: 'color' },
    brand: { value: '{colors.primary}', type: 'color' },
  },
};

/**
 * A custom format that does exactly what the docs recommend: sort allTokens
 * with the exported sortByReference helper before writing declarations.
 */
const customSortedNames = ({ dictionary, options }) =>
  [...dictionary.allTokens]
    .sort(
      sortByReference(dictionary.tokens, {
        unfilteredTokens: dictionary.unfilteredTokens,
        usesDtcg: options.usesDtcg,
      }),
    )
    .map((token) => token.name)
    .join('\n');

const sortedNamesFor = async (tokens) => {
  const sd = new StyleDictionary({
    tokens,
    hooks: {
      formats: {
        'custom/sorted-names': customSortedNames,
      },
    },
    platforms: {
      web: {
        transforms: ['name/kebab'],
        options: { outputReferences: true, showFileHeader: false },
        files: [{ destination: 'names.txt', format: 'custom/sorted-names' }],
      },
    },
  });
  const outputs = await sd.formatPlatform('web');
  return outputs[0].output;
};

describe('formatHelpers', () => {
  beforeEach(() => {
    stubMethod(console, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('sortByReference', () => {
    it('should sort DTCG tokens so a referenced token always comes first', async () => {
      const sorted = (await sortedNamesFor(dtcgTokens)).split('\n');

      expect(sorted).to.have.members(['colors-red', 'colors-primary', 'colors-brand']);
      expect(sorted.indexOf('colors-red')).to.be.lessThan(sorted.indexOf('colors-primary'));
      expect(sorted.indexOf('colors-primary')).to.be.lessThan(sorted.indexOf('colors-brand'));
    });

    it('should sort DTCG tokens the same way as the equivalent v3 token set', async () => {
      const dtcgSorted = await sortedNamesFor(dtcgTokens);
      const v3Sorted = await sortedNamesFor(v3Tokens);

      expect(dtcgSorted).to.equal(v3Sorted);
    });
  });
});
