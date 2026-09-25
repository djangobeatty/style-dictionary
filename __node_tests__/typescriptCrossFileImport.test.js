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

const fixtureDir = '__tests__/__output/ts-imports';
const lightFile = `${fixtureDir}/light.ts`;
const darkFile = `${fixtureDir}/dark.ts`;
const outputFile = `${buildPath}typescript-imports.css`;

describe('typescript token files importing each other', function () {
  this.timeout(10000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
      lightFile,
      `export interface ColorToken {
  value: string;
}

export const light: Record<'bg' | 'fg', ColorToken> = {
  bg: { value: '#ffffff' },
  fg: { value: '#111111' },
};

export default {
  base: {
    bg: light.bg,
    fg: light.fg,
  },
};
`,
      'utf-8',
    );
    fs.writeFileSync(
      darkFile,
      `import { light } from './light.ts';

// let TypeScript check that the dark theme has the same shape as the light theme
type Theme = typeof light;

const dark: Theme = {
  bg: { value: light.bg.value },
  fg: { value: '{base.fg.value}' },
};

export default {
  theme: dark,
};
`,
      'utf-8',
    );
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.rmSync(outputFile, { force: true });
  });

  it('should resolve imports between typescript token files', async () => {
    const sd = new StyleDictionary(
      {
        source: [`${fixtureDir}/*.ts`],
        platforms: {
          css: {
            transformGroup: 'css',
            buildPath,
            files: [
              {
                destination: 'typescript-imports.css',
                format: 'css/variables',
              },
            ],
          },
        },
      },
      { init: false },
    );
    await sd.init();

    // both files are picked up as sources
    expect(sd.tokens).to.have.nested.property('base.bg.value', '#ffffff');
    expect(sd.tokens.base.bg).to.have.property('filePath', lightFile);
    expect(sd.tokens.theme.bg).to.have.property('filePath', darkFile);
    // the dark theme's value is derived from the imported light theme at runtime
    expect(sd.tokens).to.have.nested.property('theme.bg.value', '#ffffff');
    // and cross-file token references are preserved for resolution
    expect(sd.tokens).to.have.nested.property('theme.fg.value', '{base.fg.value}');

    await sd.buildAllPlatforms();

    const output = fs.readFileSync(outputFile, 'utf-8');
    expect(output).to.include('--base-bg: #ffffff;');
    expect(output).to.include('--theme-bg: #ffffff;');
    expect(output).to.include('--base-fg: #111111;');
    expect(output).to.include('--theme-fg: #111111;');
  });
});
