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
import fs from 'node:fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from '../__integration__/_constants.js';

const fixturesDir = '__integration__/__ts_ref_from_ts__';
const outputFile = `${buildPath}ts-ref-from-ts.css`;

const baseJson = `{
  "base": {
    "color": { "value": "#abcdef", "type": "color" }
  }
}
`;

const wrapperTs = `interface Token {
  value: string;
  type: string;
}

const tokens: { wrapped: Token } = {
  wrapped: { value: '{base.color}', type: 'color' },
};

export default tokens;
`;

describe('integration', function () {
  describe('references from TypeScript token files', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(fixturesDir), { recursive: true });
      fs.writeFileSync(resolve(`${fixturesDir}/base.json`), baseJson);
      fs.writeFileSync(resolve(`${fixturesDir}/wrapper.ts`), wrapperTs);
    });

    it('should let tokens defined in .ts files reference tokens from other files', async () => {
      const sd = new StyleDictionary(
        {
          source: [`${fixturesDir}/*`],
          platforms: {
            css: {
              transformGroup: 'css',
              buildPath,
              files: [
                {
                  destination: 'ts-ref-from-ts.css',
                  format: 'css/variables',
                },
              ],
            },
          },
        },
        { init: false },
      );

      try {
        await sd.init();
      } catch (err) {
        // Surface the load failure directly as a test failure: a failed init
        // never settles hasInitialized, so awaiting buildAllPlatforms instead
        // would hang until the mocha timeout with no useful signal.
        throw new Error(`TypeScript token files could not be loaded: ${err.message}`);
      }

      await sd.buildAllPlatforms();

      const output = fs.readFileSync(resolve(outputFile), 'utf-8');
      // the .ts-defined token resolved the reference to the .json-defined token
      expect(output).to.include('--wrapped: #abcdef');
    });

    after(() => {
      fs.rmSync(resolve(fixturesDir), { recursive: true, force: true });
      fs.rmSync(resolve(outputFile), { force: true });
    });
  });
});
