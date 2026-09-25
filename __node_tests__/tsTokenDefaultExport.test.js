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

const fixturesDir = '__integration__/__ts_default_export__';

const defaultTs = `export const meta = { notAToken: true };

interface Token {
  value: string;
  type: string;
}

const tokens: { solo: Token } = {
  solo: { value: 'from-default-ts', type: 'other' },
};

export default tokens;
`;

const defaultMts = `export const helper = 'not-a-token';

const tokens = { soloMts: { value: 'from-default-mts', type: 'other' } };

export default tokens;
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
  describe('TypeScript default exports', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(fixturesDir), { recursive: true });
      fs.writeFileSync(resolve(`${fixturesDir}/default.ts`), defaultTs);
      fs.writeFileSync(resolve(`${fixturesDir}/default.mts`), defaultMts);
    });

    it('should use only the default export of .ts and .mts modules as token data', async () => {
      const { tokens } = await loadTokens([`${fixturesDir}/*`]);
      expect(tokens).to.have.nested.property('solo.value', 'from-default-ts');
      expect(tokens).to.have.nested.property('soloMts.value', 'from-default-mts');
      // named exports and the raw module namespace must not leak into the tokens
      expect(tokens).to.not.have.property('meta');
      expect(tokens).to.not.have.property('helper');
      expect(tokens).to.not.have.property('default');
    });

    after(() => {
      fs.rmSync(resolve(fixturesDir), { recursive: true, force: true });
    });
  });
});
