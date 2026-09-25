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
import childProcess from 'child_process';
import fs from 'node:fs';
import combineJSON from '../lib/utils/combineJSON.js';
import { clearOutput, fileExists } from '../__tests__/__helpers.js';

// Importing TypeScript files requires a runtime that strips the types away, e.g. Deno, Bun or
// Node >= 23.6 (>= 22.6 with the --experimental-strip-types flag). On runtimes without it,
// the module loader throws ERR_UNKNOWN_FILE_EXTENSION, which is asserted separately below.
let typeStripping = true;
try {
  await import('./__ts_files/tokens.ts');
} catch (e) {
  if (e.code !== 'ERR_UNKNOWN_FILE_EXTENSION') {
    throw e;
  }
  typeStripping = false;
}

describe('typescript files', () => {
  (typeStripping ? describe : describe.skip)('runtime with type stripping', () => {
    it('should load ts modules that export token objects', async () => {
      const { tokens } = await combineJSON(['__node_tests__/__ts_files/tokens.ts']);
      expect(tokens).to.have.nested.property('color.red.value', '#ff0000');
      expect(tokens).to.have.nested.property(
        'color.red.filePath',
        '__node_tests__/__ts_files/tokens.ts',
      );
      expect(tokens).to.have.nested.property('color.red.isSource', true);
    });

    it('should load mts modules that export token objects', async () => {
      const { tokens } = await combineJSON(['__node_tests__/__ts_files/*.mts']);
      expect(tokens).to.have.nested.property('size.base.value', '16px');
    });

    describe('cli', () => {
      beforeEach(() => {
        clearOutput(undefined, fs);
      });

      afterEach(() => {
        clearOutput();
      });

      it('should build ts token files with a ts config', () => {
        childProcess.execSync(
          'node ./bin/style-dictionary build --config __node_tests__/__ts_files/config.ts',
        );
        expect(fileExists('__tests__/__output/variables.css', fs)).to.be.true;
        const output = fs.readFileSync('__tests__/__output/variables.css', 'utf-8');
        expect(output).to.include('--color-red: #ff0000;');
        expect(output).to.include('--size-base: 16px;');
      });
    });
  });

  (typeStripping ? it.skip : it)(
    'should let the module loader complain about ts files rather than parsing them as JSON',
    async () => {
      let error = null;
      try {
        await combineJSON(['__node_tests__/__ts_files/tokens.ts']);
      } catch (e) {
        error = e;
      }
      expect(error).to.be.an('Error');
      expect(error.message).to.include('Unknown file extension');
    },
  );
});
