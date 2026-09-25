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

const fixtureDir = '__tests__/__output/ts-syntax';
const fixtureFile = `${fixtureDir}/tokens.ts`;

describe('typescript token files with type-only syntax', function () {
  this.timeout(10000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
      fixtureFile,
      `interface Token {
  value: string;
  type?: string;
}

type TokenGroup = Record<string, Token>;

const palette: TokenGroup = {
  primary: { value: '#00ff00', type: 'color' },
  muted: { value: '#cccccc' },
};

const config = {
  color: palette,
} satisfies { color: TokenGroup };

export default config;
`,
      'utf-8',
    );
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('should load token files that use TypeScript type syntax', async () => {
    const sd = new StyleDictionary(
      {
        source: [`${fixtureDir}/*.ts`],
      },
      { init: false },
    );
    await sd.init();

    expect(sd.tokens).to.have.nested.property('color.primary.value', '#00ff00');
    expect(sd.tokens).to.have.nested.property('color.primary.type', 'color');
    expect(sd.tokens).to.have.nested.property('color.muted.value', '#cccccc');
    expect(sd.tokens.color.primary).to.have.property('isSource', true);
  });
});
