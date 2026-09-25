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
import fs from 'node:fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from '../__integration__/_constants.js';

const sourceDir = '__integration__/__ts_source_files__';
const includeDir = '__integration__/__ts_include_files__';
const outputFile = `${buildPath}ts-source-tokens.css`;

const colorsTs = `export const version = '1.0.0';

interface ColorToken {
  value: string;
  type?: string;
}

const colors: { color: Record<string, ColorToken> } = {
  color: {
    brand: { value: '#ff0000', type: 'color' },
  },
};

export default colors;
`;

const spacingMts = `const spacing: { spacing: { md: { value: string; type: string } } } = {
  spacing: {
    md: { value: '8px', type: 'spacing' },
  },
};

export default spacing;
`;

const defaultsTs = `interface Defaults {
  button: {
    bg: {
      value: string;
      type: string;
    };
  };
}

const defaults: Defaults = {
  button: {
    bg: { value: '#00ff00', type: 'color' },
  },
};

export default defaults;
`;

describe('integration', function () {
  describe('TypeScript token files as source and include', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(sourceDir), { recursive: true });
      fs.mkdirSync(resolve(includeDir), { recursive: true });
      fs.writeFileSync(resolve(`${sourceDir}/colors.ts`), colorsTs);
      fs.writeFileSync(resolve(`${sourceDir}/spacing.mts`), spacingMts);
      fs.writeFileSync(resolve(`${includeDir}/defaults.ts`), defaultsTs);
    });

    it('should build a dictionary from .ts and .mts files matched by source and include globs', async () => {
      const sd = new StyleDictionary(
        {
          include: [`${includeDir}/*.ts`],
          source: [`${sourceDir}/*.ts`, `${sourceDir}/*.mts`],
          platforms: {
            css: {
              transformGroup: 'css',
              buildPath,
              files: [
                {
                  destination: 'ts-source-tokens.css',
                  format: 'css/variables',
                },
              ],
            },
          },
        },
        { init: false },
      );

      try {
        await sd.init();
      } catch (err) {
        // Surface the load failure directly as a test failure: a failed init
        // never settles hasInitialized, so awaiting buildAllPlatforms instead
        // would hang until the mocha timeout with no useful signal.
        throw new Error(`TypeScript token files could not be loaded: ${err.message}`);
      }

      await sd.buildAllPlatforms();

      const output = fs.readFileSync(resolve(outputFile), 'utf-8');
      // tokens exported (default export) by a .ts source file
      expect(output).to.include('--color-brand: #ff0000');
      // tokens exported (default export) by an .mts source file
      expect(output).to.include('--spacing-md: 8px');
      // tokens exported by a .ts file matched by the include glob
      expect(output).to.include('--button-bg: #00ff00');
    });

    after(() => {
      fs.rmSync(resolve(sourceDir), { recursive: true, force: true });
      fs.rmSync(resolve(includeDir), { recursive: true, force: true });
      fs.rmSync(resolve(outputFile), { force: true });
    });
  });
});
