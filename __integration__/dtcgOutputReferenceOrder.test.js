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

  describe('DTCG tokens with outputReferences in scss/variables', async () => {
    it('should declare referenced variables before the variables that reference them', async () => {
      const output = await buildScssFile(
        {
          colors: {
            red: { $value: '#ff0000' },
            primary: { $value: '{colors.red}' },
          },
        },
        'dtcg-declared-order.scss',
      );

      // $colors-red must be declared above $colors-primary, otherwise Sass
      // fails to compile with an undefined-variable error
      expect(declarationOrder(output)).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('$colors-red: #ff0000;');
      expect(output).to.include('$colors-primary: $colors-red;');

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });

    it('should declare referenced variables first even when the referencing token is defined first', async () => {
      const output = await buildScssFile(
        {
          colors: {
            // referencing token defined before the token it references
            primary: { $value: '{colors.red}' },
            red: { $value: '#ff0000' },
          },
        },
        'dtcg-reverse-declared-order.scss',
      );

      expect(declarationOrder(output)).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('$colors-red: #ff0000;');
      expect(output).to.include('$colors-primary: $colors-red;');

      const result = compileString(output);
      expect(result.css).to.not.be.undefined;
    });
  });
});
