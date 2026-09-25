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
import { compileString } from 'sass';
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

  describe('DTCG multi-level reference chains with outputReferences', async () => {
    it('should emit the chain in dependency order (base, mid, top)', async () => {
      const output = await buildScssFile(
        {
          colors: {
            base: { $value: '#000000' },
            mid: { $value: '{colors.base}' },
            top: { $value: '{colors.mid}' },
          },
        },
        'dtcg-reference-chain.scss',
      );

      expect(declarationOrder(output)).to.deep.equal(['colors-base', 'colors-mid', 'colors-top']);
      expect(output).to.include('$colors-base: #000000;');
      expect(output).to.include('$colors-mid: $colors-base;');
      expect(output).to.include('$colors-top: $colors-mid;');

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });

    it('should emit the chain in dependency order when tokens are defined in reverse', async () => {
      const output = await buildScssFile(
        {
          colors: {
            // chain defined top-down instead of bottom-up
            top: { $value: '{colors.mid}' },
            mid: { $value: '{colors.base}' },
            base: { $value: '#000000' },
          },
        },
        'dtcg-reference-chain-reverse.scss',
      );

      expect(declarationOrder(output)).to.deep.equal(['colors-base', 'colors-mid', 'colors-top']);
      expect(output).to.include('$colors-base: #000000;');
      expect(output).to.include('$colors-mid: $colors-base;');
      expect(output).to.include('$colors-top: $colors-mid;');

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });
  });
});
