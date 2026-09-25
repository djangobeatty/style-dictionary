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

const sourceDir = '__integration__/__ts_metadata_source__';
const includeDir = '__integration__/__ts_metadata_include__';

const sourceTs = `interface Token {
  value: string;
  type: string;
}

const tokens: { sourceTs: Token } = {
  sourceTs: { value: '1px', type: 'other' },
};

export default tokens;
`;

const sourceMts = `const tokens = { sourceMts: { value: '2px', type: 'other' } };

export default tokens;
`;

const includeTs = `const tokens = { includeTs: { value: '3px', type: 'other' } };

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
  describe('TypeScript token file metadata', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(sourceDir), { recursive: true });
      fs.mkdirSync(resolve(includeDir), { recursive: true });
      fs.writeFileSync(resolve(`${sourceDir}/source-ts.ts`), sourceTs);
      fs.writeFileSync(resolve(`${sourceDir}/source-mts.mts`), sourceMts);
      fs.writeFileSync(resolve(`${includeDir}/include-ts.ts`), includeTs);
    });

    it('should tag tokens from .ts and .mts files with filePath and isSource metadata', async () => {
      const source = await loadTokens([`${sourceDir}/*`], false, null, true);
      expect(source.tokens.sourceTs).to.include({
        filePath: `${sourceDir}/source-ts.ts`,
        isSource: true,
      });
      expect(source.tokens.sourceMts).to.include({
        filePath: `${sourceDir}/source-mts.mts`,
        isSource: true,
      });

      const included = await loadTokens([`${includeDir}/include-ts.ts`], false, null, false);
      expect(included.tokens.includeTs).to.include({
        filePath: `${includeDir}/include-ts.ts`,
        isSource: false,
      });
    });

    after(() => {
      fs.rmSync(resolve(sourceDir), { recursive: true, force: true });
      fs.rmSync(resolve(includeDir), { recursive: true, force: true });
    });
  });
});
