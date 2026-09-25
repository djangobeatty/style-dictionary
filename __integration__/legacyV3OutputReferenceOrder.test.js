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

const buildScssFile = async (tokens, destination, extraOptions = {}) => {
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
              ...extraOptions,
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

  describe('legacy v3 tokens with outputReferences', async () => {
    it('should generate the exact same output as before the fix', async () => {
      const output = await buildScssFile(
        {
          colors: {
            red: { value: '#ff0000' },
            primary: { value: '{colors.red}' },
          },
        },
        'v3-exact-output.scss',
        { showFileHeader: false },
      );

      expect(output.trim().split('\n')).to.deep.equal([
        '$colors-red: #ff0000;',
        '$colors-primary: $colors-red;',
      ]);

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });

    it('should still declare referenced variables first when the referencing token is defined first', async () => {
      const output = await buildScssFile(
        {
          colors: {
            primary: { value: '{colors.red}' },
            red: { value: '#ff0000' },
          },
        },
        'v3-reverse-declared-order.scss',
      );

      expect(declarationOrder(output)).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('$colors-red: #ff0000;');
      expect(output).to.include('$colors-primary: $colors-red;');

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });

    it('should still emit multi-level reference chains in dependency order', async () => {
      const output = await buildScssFile(
        {
          colors: {
            base: { value: '#000000' },
            mid: { value: '{colors.base}' },
            top: { value: '{colors.mid}' },
          },
        },
        'v3-reference-chain.scss',
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
