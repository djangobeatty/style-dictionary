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

// Extracts the order in which $variables are declared in a generated scss file
const declarationOrder = (output) => [...output.matchAll(/^\$(\S+?):/gm)].map((match) => match[1]);

const buildScssFile = async (tokens, destination) => {
  const sd = new StyleDictionary({
    tokens,
    platforms: {
      scss: {
        transformGroup: 'scss',
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
};

describe('integration', () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('DTCG and legacy v3 reference ordering', async () => {
    it('should order declarations identically for DTCG and v3 syntax tokens', async () => {
      const dtcgOutput = await buildScssFile(
        {
          colors: {
            red: { $value: '#ff0000' },
            primary: { $value: '{colors.red}' },
          },
        },
        'dtcg-syntax-order.scss',
      );
      const v3Output = await buildScssFile(
        {
          colors: {
            red: { value: '#ff0000' },
            primary: { value: '{colors.red}' },
          },
        },
        'v3-syntax-order.scss',
      );

      const dtcgOrder = declarationOrder(dtcgOutput);
      const v3Order = declarationOrder(v3Output);

      expect(dtcgOrder).to.deep.equal(v3Order);
      expect(dtcgOrder).to.deep.equal(['colors-red', 'colors-primary']);
      expect(dtcgOutput).to.include('$colors-primary: $colors-red;');
      expect(v3Output).to.include('$colors-primary: $colors-red;');
    });

    it('should order declarations identically when the referencing token is defined first', async () => {
      const dtcgOutput = await buildScssFile(
        {
          colors: {
            primary: { $value: '{colors.red}' },
            red: { $value: '#ff0000' },
          },
        },
        'dtcg-syntax-reverse-order.scss',
      );
      const v3Output = await buildScssFile(
        {
          colors: {
            primary: { value: '{colors.red}' },
            red: { value: '#ff0000' },
          },
        },
        'v3-syntax-reverse-order.scss',
      );

      const dtcgOrder = declarationOrder(dtcgOutput);
      const v3Order = declarationOrder(v3Output);

      expect(dtcgOrder).to.deep.equal(v3Order);
      expect(dtcgOrder).to.deep.equal(['colors-red', 'colors-primary']);
    });
  });
});
