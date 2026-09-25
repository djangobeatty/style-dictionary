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

const fixturesDir = '__integration__/__ts_deep_merge__';

const groupTs = `const tokens = { group: { fromTs: { value: 'a', type: 'other' } } };

export default tokens;
`;

const groupMts = `const tokens = { group: { fromMts: { value: 'b', type: 'other' } } };

export default tokens;
`;

const groupJson = `{
  "group": {
    "fromJson": { "value": "c", "type": "other" }
  }
}
`;

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
  describe('deep merge with TypeScript token files', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(fixturesDir), { recursive: true });
      fs.writeFileSync(resolve(`${fixturesDir}/group-ts.ts`), groupTs);
      fs.writeFileSync(resolve(`${fixturesDir}/group-mts.mts`), groupMts);
      fs.writeFileSync(resolve(`${fixturesDir}/group-json.json`), groupJson);
    });

    it('should deep merge .ts and .mts files together with json files', async () => {
      const { tokens } = await loadTokens([`${fixturesDir}/*`], true);
      // all three files define a "group" key; a shallow merge would keep only
      // the last file's group, so every subkey surviving proves the deep merge
      expect(tokens).to.have.nested.property('group.fromTs.value', 'a');
      expect(tokens).to.have.nested.property('group.fromMts.value', 'b');
      expect(tokens).to.have.nested.property('group.fromJson.value', 'c');
    });

    after(() => {
      fs.rmSync(resolve(fixturesDir), { recursive: true, force: true });
    });
  });
});
