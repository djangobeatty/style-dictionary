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

const fixtureDir = '__node_tests__/__ts_fixtures__/parity';
const rootBuildPath = '__integration__/build/ts-parity';
const tsBuildPath = `${rootBuildPath}/ts/`;
const jsBuildPath = `${rootBuildPath}/js/`;

const tsTokens = `type TokenValue = { value: string };
type TokenGroup = Record<string, TokenValue>;

const color: TokenGroup = {
  red: { value: '#ff0000' },
  green: { value: '#00ff00' },
};

const brand: TokenGroup = {
  primary: { value: '{color.red}' },
};

export default { color, brand };
`;

const jsTokens = `const color = {
  red: { value: '#ff0000' },
  green: { value: '#00ff00' },
};

const brand = {
  primary: { value: '{color.red}' },
};

export default { color, brand };
`;

const platforms = (buildPath) => ({
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
  json: {
    transformGroup: 'js',
    buildPath,
    files: [
      {
        destination: 'flat.json',
        format: 'json/flat',
      },
    ],
  },
});

// init: false + awaiting init() so that a token file that fails to load rejects here,
// rather than escaping as an unhandled rejection from the constructor.
const build = async (source, buildPath) => {
  const sd = new StyleDictionary(
    {
      source,
      platforms: platforms(buildPath),
      log: { verbosity: 'silent' },
    },
    { init: false },
  );
  await sd.init();
  await sd.buildAllPlatforms();
};

describe('typescript token files', () => {
  describe('output parity with the equivalent javascript token file', () => {
    before(async function () {
      this.timeout(10000);
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(`${fixtureDir}/tokens.ts`, tsTokens, 'utf-8');
      fs.writeFileSync(`${fixtureDir}/tokens.js`, jsTokens, 'utf-8');

      await build([`${fixtureDir}/*.ts`], tsBuildPath);
      await build([`${fixtureDir}/*.js`], jsBuildPath);
    });

    after(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
    });

    it('should produce css output byte-identical to the javascript build', () => {
      const tsOutput = fs.readFileSync(`${tsBuildPath}vars.css`, 'utf-8');
      const jsOutput = fs.readFileSync(`${jsBuildPath}vars.css`, 'utf-8');

      // the TS build must have actually produced the tokens, not an empty file
      expect(tsOutput).to.include('--color-red: #ff0000;');
      expect(tsOutput).to.include('--color-green: #00ff00;');
      // references declared inside the TS file resolve
      expect(tsOutput).to.include('--brand-primary: #ff0000;');

      expect(tsOutput).to.equal(jsOutput);
    });

    it('should produce json output byte-identical to the javascript build', () => {
      const tsOutput = fs.readFileSync(`${tsBuildPath}flat.json`, 'utf-8');
      const jsOutput = fs.readFileSync(`${jsBuildPath}flat.json`, 'utf-8');

      const parsed = JSON.parse(tsOutput);
      expect(Object.keys(parsed)).to.have.lengthOf(3);
      expect(Object.values(parsed)).to.include('#ff0000');
      expect(Object.values(parsed)).to.include('#00ff00');

      expect(tsOutput).to.equal(jsOutput);
    });
  });
});
