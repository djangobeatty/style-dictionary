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
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from './_constants.js';
import { clearOutput } from '../__tests__/__helpers.js';

const destination = 'sortByReferenceDtcgChains.scss';

// DTCG multi-level reference chain: accent -> primary -> red.
// Every token must be declared after everything it references.
const chainTokens = {
  colors: {
    red: { $value: '#ff0000', $type: 'color' },
    primary: { $value: '{colors.red}', $type: 'color' },
    accent: { $value: '{colors.primary}', $type: 'color' },
  },
};

// Same chain, declared in reverse source order, so the formatter has to
// actually sort by reference to produce valid output.
const swappedChainTokens = {
  colors: {
    accent: { $value: '{colors.primary}', $type: 'color' },
    primary: { $value: '{colors.red}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
  },
};

const chainDeclarations = [
  '$colors-red: #ff0000;',
  '$colors-primary: $colors-red;',
  '$colors-accent: $colors-primary;',
];

async function buildScss(tokens) {
  const sd = new StyleDictionary({
    tokens,
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath,
        files: [
          {
            destination,
            format: 'scss/variables',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
  return fs.readFileSync(resolve(`${buildPath}${destination}`), { encoding: 'UTF-8' });
}

function expectDeclarationsInOrder(output) {
  let lastIndex = -1;
  for (const declaration of chainDeclarations) {
    expect(output).to.include(declaration);
    const index = output.indexOf(declaration);
    expect(index).to.be.greaterThan(lastIndex);
    lastIndex = index;
  }
}

describe('integration', async () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('sortByReference with DTCG reference chains', async () => {
    it('should declare a multi-level DTCG chain in definition order', async () => {
      const output = await buildScss(chainTokens);
      expectDeclarationsInOrder(output);
    });

    it('should declare a reversed multi-level DTCG chain in definition order', async () => {
      const output = await buildScss(swappedChainTokens);
      expectDeclarationsInOrder(output);
    });
  });
});
