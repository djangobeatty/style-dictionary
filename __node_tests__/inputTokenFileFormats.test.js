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

const formatsDir = '__integration__/__input_formats__';
const customDir = '__integration__/__input_formats_custom__';
const brokenDir = '__integration__/__input_formats_broken__';

const formatFiles = {
  'tokens.json': '{ "jsonToken": { "value": "from-json" } }',
  'tokens.json5': `{
  // json5 comment
  json5Token: { value: 'from-json5' },
}`,
  'tokens.jsonc': `{
  // jsonc comment
  "jsoncToken": { "value": "from-jsonc" }
}`,
  'tokens.js': `export default { jsToken: { value: 'from-js' } };`,
  'tokens.mjs': `export default { mjsToken: { value: 'from-mjs' } };`,
};

const customFiles = {
  'tokens.custom': '{ "customToken": { "value": "from-custom-parser" } }',
  'type-script.ts': `const parsed = { parsedTsToken: { value: 'from-ts-module' } };

export default parsed;`,
};

const parsers = {
  'custom-extension': {
    pattern: /\.custom$/,
    parser: ({ contents }) => JSON.parse(contents),
  },
  'typescript-override': {
    pattern: /\.ts$/,
    parser: () => ({ parsedTsToken: { value: 'from-ts-parser' } }),
  },
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
  describe('input token file formats', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(formatsDir), { recursive: true });
      fs.mkdirSync(resolve(customDir), { recursive: true });
      fs.mkdirSync(resolve(brokenDir), { recursive: true });
      Object.entries(formatFiles).forEach(([name, contents]) => {
        fs.writeFileSync(resolve(`${formatsDir}/${name}`), contents);
      });
      Object.entries(customFiles).forEach(([name, contents]) => {
        fs.writeFileSync(resolve(`${customDir}/${name}`), contents);
      });
      fs.writeFileSync(resolve(`${brokenDir}/broken.json`), '{\n  "broken": !\n}');
    });

    it('should load json, json5, jsonc, js and mjs token files unchanged', async () => {
      const { tokens } = await loadTokens([`${formatsDir}/*`]);
      expect(tokens).to.have.nested.property('jsonToken.value', 'from-json');
      expect(tokens).to.have.nested.property('json5Token.value', 'from-json5');
      expect(tokens).to.have.nested.property('jsoncToken.value', 'from-jsonc');
      expect(tokens).to.have.nested.property('jsToken.value', 'from-js');
      expect(tokens).to.have.nested.property('mjsToken.value', 'from-mjs');
    });

    it('should prefer custom parsers for matched files, including .ts files', async () => {
      const { tokens } = await loadTokens([`${customDir}/*`], false, null, true, parsers);
      expect(tokens).to.have.nested.property('customToken.value', 'from-custom-parser');
      expect(tokens).to.have.nested.property('parsedTsToken.value', 'from-ts-parser');
    });

    it('should still report a JSON syntax error for broken json files', async () => {
      let message = '';
      try {
        await combineJSON([`${brokenDir}/*.json`]);
      } catch (err) {
        message = err.message;
      }
      expect(message).to.include('Failed to load or parse JSON or JS Object:');
      expect(message).to.include('JSON5:');
    });

    after(() => {
      fs.rmSync(resolve(formatsDir), { recursive: true, force: true });
      fs.rmSync(resolve(customDir), { recursive: true, force: true });
      fs.rmSync(resolve(brokenDir), { recursive: true, force: true });
    });
  });
});
