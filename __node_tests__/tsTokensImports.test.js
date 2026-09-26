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
import fs from 'node:fs';
import StyleDictionary from 'style-dictionary';

const fixtureDir = '__node_tests__/__ts_fixtures__/imports';
const rootBuildPath = '__integration__/build/ts-imports';
const buildPath = `${rootBuildPath}/css/`;

// a TS token file whose values another TS token file imports
const baseTs = `export const white: string = '#ffffff';

const tokens = {
  color: {
    white: { value: white },
  },
};

export default tokens;
`;

// a JS token file whose values a TS token file imports
const legacyJs = `export const black = '#000000';

export default {
  color: {
    black: { value: black },
  },
};
`;

// imports from both the TS and the JS token file above
const themeTs = `import base from './base.ts';
import { black } from './legacy.js';

type TokenGroup = Record<string, { value: string }>;

const theme: TokenGroup = {
  page: { value: base.color.white.value },
  ink: { value: black },
};

export default {
  color: {
    page: theme.page,
    ink: theme.ink,
  },
};
`;

describe('typescript token files', () => {
  describe('importing token values from other token files', () => {
    let output;

    before(async function () {
      this.timeout(10000);
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(`${fixtureDir}/base.ts`, baseTs, 'utf-8');
      fs.writeFileSync(`${fixtureDir}/legacy.js`, legacyJs, 'utf-8');
      fs.writeFileSync(`${fixtureDir}/theme.ts`, themeTs, 'utf-8');

      // init: false + awaiting init() so a token file that fails to load rejects here,
      // rather than escaping as an unhandled rejection from the constructor.
      const sd = new StyleDictionary(
        {
          source: [`${fixtureDir}/*.ts`, `${fixtureDir}/*.js`],
          platforms: {
            css: {
              transformGroup: 'css',
              buildPath,
              files: [
                {
                  destination: 'vars.css',
                  format: 'css/variables',
                  options: { showFileHeader: false },
                },
              ],
            },
          },
          log: { verbosity: 'silent' },
        },
        { init: false },
      );
      await sd.init();
      await sd.buildAllPlatforms();

      output = fs.readFileSync(`${buildPath}vars.css`, 'utf-8');
    });

    after(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
    });

    it('should resolve values imported from another typescript token file', () => {
      // declared in base.ts
      expect(output).to.include('--color-white: #ffffff;');
      // theme.ts imported base.ts and reused its value
      expect(output).to.include('--color-page: #ffffff;');
    });

    it('should resolve values imported from a javascript token file', () => {
      // declared in legacy.js
      expect(output).to.include('--color-black: #000000;');
      // theme.ts imported legacy.js and reused its value
      expect(output).to.include('--color-ink: #000000;');
    });
  });
});
