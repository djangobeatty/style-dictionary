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
import { resolve } from '../lib/resolve.js';

const fixturesDir = '__integration__/__ts_import_error__';

// Node only imports TypeScript when type stripping is enabled (flag added in
// 22.6, on by default since 23.6). To simulate a runtime that cannot import
// TypeScript files, disable stripping when this Node accepts the flag; older
// Nodes cannot import TypeScript to begin with and reject the flag itself, so
// there we simply run plain "node". The assertions below are identical either
// way — the probe only picks the environment, it never weakens a check.
const stripTypesFlag = (() => {
  try {
    childProcess.execSync('node --no-experimental-strip-types --version', { stdio: 'ignore' });
    return '--no-experimental-strip-types';
  } catch {
    return '';
  }
})();

// Runs combineJSON against the given token file in that child process and
// reports whatever error Style Dictionary surfaces on stdout.
const runnerMjs = `import combineJSON from '../../lib/utils/combineJSON.js';

try {
  await combineJSON([process.argv[2]]);
  process.stdout.write('LOADED');
} catch (err) {
  process.stdout.write('LOAD_ERROR ' + err.message);
}
`;

const unimportableTs = `interface Token {
  value: string;
}

const token: Token = { value: 'nope' };

export default { errorToken: token };
`;

const unimportableMts = `const token: { value: string } = { value: 'nope' };

export default { errorToken: token };
`;

const runLoader = (target) =>
  childProcess.execSync(
    `node ${stripTypesFlag} ${fixturesDir}/runner.mjs ${fixturesDir}/${target}`,
    { encoding: 'utf-8' },
  );

describe('integration', function () {
  describe('TypeScript import failures', function () {
    this.timeout(30000);

    before(() => {
      fs.mkdirSync(resolve(fixturesDir), { recursive: true });
      fs.writeFileSync(resolve(`${fixturesDir}/runner.mjs`), runnerMjs);
      fs.writeFileSync(resolve(`${fixturesDir}/unimportable.ts`), unimportableTs);
      fs.writeFileSync(resolve(`${fixturesDir}/unimportable.mts`), unimportableMts);
    });

    it('should identify the .ts file that failed instead of reporting a JSON syntax error', () => {
      const stdout = runLoader('unimportable.ts');
      expect(stdout).to.include('LOAD_ERROR');
      expect(stdout).to.include('unimportable.ts');
      expect(stdout).to.not.include('JSON5');
      expect(stdout).to.not.include('invalid character');
    });

    it('should identify the .mts file that failed instead of reporting a JSON syntax error', () => {
      const stdout = runLoader('unimportable.mts');
      expect(stdout).to.include('LOAD_ERROR');
      expect(stdout).to.include('unimportable.mts');
      expect(stdout).to.not.include('JSON5');
      expect(stdout).to.not.include('invalid character');
    });

    after(() => {
      fs.rmSync(resolve(fixturesDir), { recursive: true, force: true });
    });
  });
});
