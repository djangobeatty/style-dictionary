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

const fixtureDir = '__node_tests__/__ts_fixtures__/metadata';
const rootBuildPath = '__integration__/build/ts-metadata';
const buildPath = `${rootBuildPath}/meta/`;

const defaultsTs = `type TokenGroup = Record<string, { value: string }>;

const color: TokenGroup = {
  base: { value: '#111111' },
};

export default { color };
`;

const sourceTs = `type TokenGroup = Record<string, { value: string }>;

const color: TokenGroup = {
  accent: { value: '#222222' },
};

export default { color };
`;

// a typography token with a property that is not part of the CSS font shorthand,
// which makes Style Dictionary log a warning that names the file the token came from
const typographyTs = `type Typography = {
  type: string;
  value: Record<string, string>;
};

const heading: Typography = {
  type: 'typography',
  value: {
    fontFamily: 'Arial',
    fontSize: '16px',
    letterSpacing: '0.5px',
  },
};

export default { heading };
`;

describe('typescript token files', () => {
  describe('token metadata', () => {
    let tokenMeta;

    before(async function () {
      this.timeout(10000);
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(`${fixtureDir}/defaults.ts`, defaultsTs, 'utf-8');
      fs.writeFileSync(`${fixtureDir}/source.ts`, sourceTs, 'utf-8');

      // init: false + awaiting init() so a token file that fails to load rejects here,
      // rather than escaping as an unhandled rejection from the constructor.
      const sd = new StyleDictionary(
        {
          include: [`${fixtureDir}/defaults.ts`],
          source: [`${fixtureDir}/source.ts`],
          hooks: {
            formats: {
              tokenMeta: ({ dictionary }) =>
                JSON.stringify(
                  dictionary.allTokens.map((token) => ({
                    path: token.path.join('.'),
                    filePath: token.filePath,
                    isSource: token.isSource,
                  })),
                  null,
                  2,
                ),
            },
          },
          platforms: {
            meta: {
              transformGroup: 'css',
              buildPath,
              files: [{ destination: 'meta.json', format: 'tokenMeta' }],
            },
          },
          log: { verbosity: 'silent' },
        },
        { init: false },
      );
      await sd.init();
      await sd.buildAllPlatforms();

      tokenMeta = JSON.parse(fs.readFileSync(`${buildPath}meta.json`, 'utf-8'));
    });

    after(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
    });

    it('should point filePath at the typescript file a source token came from', () => {
      const accent = tokenMeta.find((token) => token.path === 'color.accent');
      expect(accent, 'color.accent should be in the dictionary').to.be.an('object');
      expect(accent.filePath).to.be.a('string');
      expect(accent.filePath).to.match(/source\.ts$/);
      expect(accent.filePath).to.include('__ts_fixtures__/metadata');
      expect(accent.isSource).to.be.true;
    });

    it('should point filePath at the typescript file an included token came from', () => {
      const base = tokenMeta.find((token) => token.path === 'color.base');
      expect(base, 'color.base should be in the dictionary').to.be.an('object');
      expect(base.filePath).to.be.a('string');
      expect(base.filePath).to.match(/defaults\.ts$/);
      expect(base.filePath).to.include('__ts_fixtures__/metadata');
      expect(base.isSource).to.be.false;
    });
  });

  describe('token metadata in logs', () => {
    const logFixtureDir = '__node_tests__/__ts_fixtures__/metadata-log';
    const logBuildPath = '__integration__/build/ts-metadata-log/';

    before(() => {
      fs.rmSync(logFixtureDir, { recursive: true, force: true });
      fs.mkdirSync(logFixtureDir, { recursive: true });
      fs.writeFileSync(`${logFixtureDir}/typography.ts`, typographyTs, 'utf-8');
    });

    after(() => {
      fs.rmSync(logFixtureDir, { recursive: true, force: true });
      fs.rmSync('__integration__/build/ts-metadata-log', { recursive: true, force: true });
    });

    it('should name the typescript file in warnings about its tokens', async function () {
      this.timeout(10000);
      const sd = new StyleDictionary(
        {
          source: [`${logFixtureDir}/typography.ts`],
          platforms: {
            css: {
              transformGroup: 'css',
              buildPath: logBuildPath,
              files: [{ destination: 'vars.css', format: 'css/variables' }],
            },
          },
          log: { verbosity: 'verbose', warnings: 'error' },
        },
        { init: false },
      );

      let error = null;
      try {
        await sd.init();
        await sd.buildAllPlatforms();
      } catch (err) {
        error = err;
      }

      expect(error).to.be.an('Error');
      // the warning is about the typography token's unsupported property...
      expect(error.message).to.include('letterSpacing');
      // ...and it names the TypeScript file the token was loaded from
      expect(error.message).to.include(`${logFixtureDir}/typography.ts`);
    });
  });
});
