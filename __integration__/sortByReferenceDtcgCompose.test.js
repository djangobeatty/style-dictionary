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

const destination = 'sortByReferenceDtcg.kt';

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

async function buildCompose(tokens) {
  const sd = new StyleDictionary({
    tokens,
    platforms: {
      compose: {
        transformGroup: 'compose',
        buildPath,
        files: [
          {
            destination,
            format: 'compose/object',
            options: {
              outputReferences: true,
              className: 'StyleDictionary',
              packageName: 'com.example.tokens',
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
  const lines = output.split('\n');
  const redIndex = lines.findIndex((line) => line.includes('val colorsRed ='));
  const primaryIndex = lines.findIndex((line) => line.includes('val colorsPrimary ='));

  expect(redIndex).to.be.greaterThan(-1);
  expect(primaryIndex).to.be.greaterThan(-1);
  expect(redIndex).to.be.lessThan(primaryIndex);
  // the referencing property keeps the reference to the declared property
  expect(lines[primaryIndex]).to.include('colorsRed');
}

describe('integration', async () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('sortByReference with DTCG tokens in compose/object output', async () => {
    it('should declare the referenced property before the one that uses it', async () => {
      const output = await buildCompose(dtcgTokens);
      expectDeclarationsInOrder(output);
    });

    it('should reorder tokens when the source lists the referencing token first', async () => {
      const output = await buildCompose(swappedDtcgTokens);
      expectDeclarationsInOrder(output);
    });
  });
});
