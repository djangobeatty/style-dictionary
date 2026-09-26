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
import childProcess from 'node:child_process';
import fs from 'node:fs';

const fixtureDir = '__node_tests__/__ts_fixtures__/unsupported';
const rootBuildPath = '__integration__/build/ts-unsupported';

const tokensTs = `type TokenValue = { value: string };

const color: Record<string, TokenValue> = {
  red: { value: '#ff0000' },
};

export default { color };
`;

const tokensJs = `const color = {
  red: { value: '#ff0000' },
};

export default { color };
`;

const config = (sourceFile, out) => ({
  source: [`${fixtureDir}/${sourceFile}`],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: `${rootBuildPath}/${out}/`,
      files: [{ destination: 'vars.css', format: 'css/variables' }],
    },
  },
});

/**
 * Node versions before 22.6 cannot execute TypeScript at all, so plain `node` is
 * already a runtime without TypeScript support there. Newer versions strip types
 * by default and need it switched off explicitly. Probing for the flag keeps this
 * test valid across the whole range declared in package.json engines (>=18).
 */
let nodeArgs = [];

const runCli = (configFile) =>
  childProcess.spawnSync(
    process.execPath,
    [...nodeArgs, './bin/style-dictionary.js', 'build', '--config', `${fixtureDir}/${configFile}`],
    { encoding: 'utf-8' },
  );

describe('typescript token files', () => {
  describe('on a runtime that cannot execute typescript', () => {
    before(function () {
      this.timeout(10000);

      const probe = childProcess.spawnSync(
        process.execPath,
        ['--no-experimental-strip-types', '-e', '0'],
        { encoding: 'utf-8' },
      );
      nodeArgs = probe.status === 0 ? ['--no-experimental-strip-types'] : [];

      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(`${fixtureDir}/tokens.ts`, tokensTs, 'utf-8');
      fs.writeFileSync(`${fixtureDir}/tokens.js`, tokensJs, 'utf-8');
      fs.writeFileSync(
        `${fixtureDir}/config-ts.json`,
        JSON.stringify(config('tokens.ts', 'ts'), null, 2),
        'utf-8',
      );
      fs.writeFileSync(
        `${fixtureDir}/config-js.json`,
        JSON.stringify(config('tokens.js', 'js'), null, 2),
        'utf-8',
      );
    });

    after(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
    });

    it('should still build javascript token files on that runtime', function () {
      this.timeout(10000);
      const result = runCli('config-js.json');
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

      // proves the runtime itself is healthy, so the TS failure below is TS-specific
      expect(result.status, `expected a successful build, got:\n${output}`).to.equal(0);
      const built = fs.readFileSync(`${rootBuildPath}/js/vars.css`, 'utf-8');
      expect(built).to.include('--color-red: #ff0000;');
    });

    it('should fail with an error naming the file as a typescript loading failure', function () {
      this.timeout(10000);
      const result = runCli('config-ts.json');
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

      expect(result.status, `expected a failing build, got:\n${output}`).to.not.equal(0);
      // names the offending file
      expect(output, output).to.include(`${fixtureDir}/tokens.ts`);
      // identifies it as a TypeScript loading problem
      expect(output, output).to.match(/typescript/i);
      // ... rather than the misleading JSON parse error
      expect(output, output).to.not.match(/or parse JSON/i);
      expect(output, output).to.not.match(/JSON5/);
      // the build produced no output file for the TS platform
      expect(fs.existsSync(`${rootBuildPath}/ts/vars.css`)).to.be.false;
    });
  });
});
