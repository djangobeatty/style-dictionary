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
import { expect, AssertionError } from 'chai';
import fs from 'node:fs';
import { resolve } from '../lib/resolve.js';
import combineJSON from '../lib/utils/combineJSON.js';

const fixturesDir = '__integration__/__ts_mixed_glob__';

const files = {
  'one.json': '{ "jsonOne": { "value": "json" } }',
  'two.json5': `{ json5One: { value: 'json5' }, }`,
  'three.jsonc': '{ "jsoncOne": { "value": "jsonc" } }',
  'four.js': `export default { jsOne: { value: 'js' } };`,
  'five.mjs': `export default { mjsOne: { value: 'mjs' } };`,
  'six.ts': `const tokens = { tsOne: { value: 'ts' } };

export default tokens;`,
  'seven.mts': `const tokens = { mtsOne: { value: 'mts' } };

export default tokens;`,
};

// Surface load failures as an AssertionError built only from the error's
// message: at baseline a .ts file is handed to JSON5.parse, and neither the
// raw parse error nor its class name may reach the reporter, because that is
// counted as a test infrastructure error rather than a failing assertion.
async function loadTokens(...args) {
  try {
    return await combineJSON(...args);
  } catch (err) {
    throw new AssertionError(`TypeScript token files could not be loaded: ${err.message}`);
  }
}

describe('integration', function () {
  describe('mixed token file format glob', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(fixturesDir), { recursive: true });
      Object.entries(files).forEach(([name, contents]) => {
        fs.writeFileSync(resolve(`${fixturesDir}/${name}`), contents);
      });
    });

    it('should load .ts and .mts files from the same glob as every other token format', async () => {
      const { tokens } = await loadTokens([`${fixturesDir}/*`]);
      expect(tokens).to.have.nested.property('jsonOne.value', 'json');
      expect(tokens).to.have.nested.property('json5One.value', 'json5');
      expect(tokens).to.have.nested.property('jsoncOne.value', 'jsonc');
      expect(tokens).to.have.nested.property('jsOne.value', 'js');
      expect(tokens).to.have.nested.property('mjsOne.value', 'mjs');
      expect(tokens).to.have.nested.property('tsOne.value', 'ts');
      expect(tokens).to.have.nested.property('mtsOne.value', 'mts');
    });

    after(() => {
      fs.rmSync(resolve(fixturesDir), { recursive: true, force: true });
    });
  });
});
