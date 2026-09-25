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

const fixtureDir = '__tests__/__output/ts-source';
const fixtureFile = `${fixtureDir}/colors.ts`;

describe('typescript token files as source', function () {
  this.timeout(10000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
      fixtureFile,
      `export default {
  color: {
    brand: { value: '#ff0000' },
  },
};
`,
      'utf-8',
    );
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('should load TypeScript token files that match a source glob', async () => {
    const sd = new StyleDictionary(
      {
        // the exact glob shape used in the feature request: src/*.*ts
        source: [`${fixtureDir}/*.*ts`],
      },
      { init: false },
    );
    await sd.init();

    expect(sd.tokens).to.have.nested.property('color.brand.value', '#ff0000');
    expect(sd.tokens.color.brand).to.have.property('filePath', fixtureFile);
    expect(sd.tokens.color.brand).to.have.property('isSource', true);
  });
});
