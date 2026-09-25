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
import { buildPath } from '../__integration__/_constants.js';

const fixtureDir = '__tests__/__output/ts-build-src';
const fixtureFile = `${fixtureDir}/tokens.ts`;
const outputFile = `${buildPath}typescript.css`;

describe('building platforms with typescript token files', function () {
  this.timeout(10000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
      fixtureFile,
      `type ColorToken = { value: string };

const tokens: { color: Record<string, ColorToken> } = {
  color: {
    canvas: { value: '#123456' },
    surface: { value: '#abcdef' },
  },
};

export default tokens;
`,
      'utf-8',
    );
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.rmSync(outputFile, { force: true });
  });

  it('should transform and format tokens from .ts sources into build output', async () => {
    const sd = new StyleDictionary(
      {
        source: [`${fixtureDir}/*.ts`],
        platforms: {
          css: {
            transformGroup: 'css',
            buildPath,
            files: [
              {
                destination: 'typescript.css',
                format: 'css/variables',
              },
            ],
          },
        },
      },
      { init: false },
    );
    await sd.init();
    await sd.buildAllPlatforms();

    const output = fs.readFileSync(outputFile, 'utf-8');
    expect(output).to.include(':root {');
    expect(output).to.include('--color-canvas: #123456;');
    expect(output).to.include('--color-surface: #abcdef;');
  });
});
