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

const destination = 'sortByReferenceDtcg.css';

// DTCG tokens in the order shown in the ticket
const dtcgTokens = {
  colors: {
    red: { $value: '#ff0000', $type: 'color' },
    primary: { $value: '{colors.red}', $type: 'color' },
  },
};

// Same tokens with the referencing token first in the source
const swappedDtcgTokens = {
  colors: {
    primary: { $value: '{colors.red}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
  },
};

const declarations = ['--colors-red: #ff0000;', '--colors-primary: var(--colors-red);'];

async function buildCss(tokens) {
  const sd = new StyleDictionary({
    tokens,
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath,
        files: [
          {
            destination,
            format: 'css/variables',
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
  for (const declaration of declarations) {
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

  describe('sortByReference with DTCG tokens in css/variables output', async () => {
    it('should declare the referenced custom property before the one that uses it', async () => {
      const output = await buildCss(dtcgTokens);
      expectDeclarationsInOrder(output);
    });

    it('should reorder tokens when the source lists the referencing token first', async () => {
      const output = await buildCss(swappedDtcgTokens);
      expectDeclarationsInOrder(output);
    });
  });
});
