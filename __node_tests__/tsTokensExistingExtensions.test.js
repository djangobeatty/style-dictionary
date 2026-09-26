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

const fixtureDir = '__node_tests__/__ts_fixtures__/existing';
const rootBuildPath = '__integration__/build/ts-existing';

const cssPlatform = (buildPath) => ({
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
});

describe('token file extensions other than typescript', () => {
  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.rmSync(rootBuildPath, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.writeFileSync(
      `${fixtureDir}/a.json`,
      `{ "color": { "plainJson": { "value": "#000001" } } }\n`,
      'utf-8',
    );
    // json5 flavour: unquoted keys, single quotes, trailing comma, comment
    fs.writeFileSync(
      `${fixtureDir}/b.json5`,
      `{\n  // json5 tokens\n  color: {\n    fiveJson: { value: '#000002' },\n  },\n}\n`,
      'utf-8',
    );
    fs.writeFileSync(
      `${fixtureDir}/c.jsonc`,
      `{\n  /* jsonc tokens */\n  "color": { "cJson": { "value": "#000003" } }\n}\n`,
      'utf-8',
    );
    fs.writeFileSync(
      `${fixtureDir}/d.js`,
      `export default { color: { plainJs: { value: '#000004' } } };\n`,
      'utf-8',
    );
    fs.writeFileSync(
      `${fixtureDir}/e.mjs`,
      `export default { color: { moduleJs: { value: '#000005' } } };\n`,
      'utf-8',
    );
    // valid TypeScript, but a custom parser also matches it
    fs.writeFileSync(
      `${fixtureDir}/custom.ts`,
      `const tokens = { color: { fromTs: { value: '#000006' } } };\n\nexport default tokens;\n`,
      'utf-8',
    );
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.rmSync(rootBuildPath, { recursive: true, force: true });
  });

  it('should keep loading json, json5, jsonc, js and mjs token files', async function () {
    this.timeout(10000);
    const buildPath = `${rootBuildPath}/others/`;
    const sd = new StyleDictionary(
      {
        source: [
          `${fixtureDir}/*.json`,
          `${fixtureDir}/*.json5`,
          `${fixtureDir}/*.jsonc`,
          `${fixtureDir}/*.js`,
          `${fixtureDir}/*.mjs`,
        ],
        platforms: cssPlatform(buildPath),
        log: { verbosity: 'silent' },
      },
      { init: false },
    );
    await sd.init();
    await sd.buildAllPlatforms();

    const output = fs.readFileSync(`${buildPath}vars.css`, 'utf-8');
    expect(output).to.include('--color-plain-json: #000001;');
    expect(output).to.include('--color-five-json: #000002;');
    expect(output).to.include('--color-c-json: #000003;');
    expect(output).to.include('--color-plain-js: #000004;');
    expect(output).to.include('--color-module-js: #000005;');
    // the .ts file is not part of these globs
    expect(output).to.not.include('from-ts');
  });

  it('should let a custom parser whose pattern matches .ts files handle them', async function () {
    this.timeout(10000);
    const buildPath = `${rootBuildPath}/parser/`;
    const sd = new StyleDictionary(
      {
        source: [`${fixtureDir}/custom.ts`],
        // a registered parser only runs when it is applied by name
        parsers: ['ts-parser'],
        hooks: {
          parsers: {
            'ts-parser': {
              pattern: /\.ts$/,
              parser: ({ filePath }) => ({
                color: {
                  fromParser: { value: '#000007' },
                  parsedFile: {
                    value: filePath.endsWith('custom.ts') ? '#000008' : '#999999',
                  },
                },
              }),
            },
          },
        },
        platforms: cssPlatform(buildPath),
        log: { verbosity: 'silent' },
      },
      { init: false },
    );
    await sd.init();
    await sd.buildAllPlatforms();

    const output = fs.readFileSync(`${buildPath}vars.css`, 'utf-8');
    // the parser's output is what ends up in the build...
    expect(output).to.include('--color-from-parser: #000007;');
    expect(output).to.include('--color-parsed-file: #000008;');
    // ...and the file's default export is never used
    expect(output).to.not.include('from-ts');
    expect(output).to.not.include('#000006');
  });
});
