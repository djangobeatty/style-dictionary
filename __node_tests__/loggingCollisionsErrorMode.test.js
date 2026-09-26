/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import { cleanConsoleOutput } from '../__integration__/_constants.js';
import { fileExists } from '../__tests__/__helpers.js';

const fixtureDir = '__tests__/__output/cli-logging-coll-error';

/**
 * Run the style-dictionary CLI the way a user would and capture everything
 * it prints, so we can assert on the observable logging behavior.
 */
function runStyleDictionary(args) {
  const result = spawnSync(process.execPath, ['./bin/style-dictionary', ...args], {
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const stdout = cleanConsoleOutput(result.stdout ?? '');
  const stderr = cleanConsoleOutput(result.stderr ?? '');
  return { status: result.status, stdout, output: `${stdout}\n${stderr}` };
}

function setupFixtures() {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.mkdirSync(`${fixtureDir}/tokens`, { recursive: true });
  // two source files that collide on the same token path (property value collision)
  fs.writeFileSync(
    `${fixtureDir}/tokens/one.json`,
    `${JSON.stringify(
      {
        size: { pad: { medium: { value: '8px', type: 'dimension' } } },
        btn: { red: { value: '#ff0000', type: 'color' } },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    `${fixtureDir}/tokens/two.json`,
    `${JSON.stringify(
      {
        size: { pad: { medium: { value: '12px', type: 'dimension' } } },
        text: { red: { value: '#cc0000', type: 'color' } },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    `${fixtureDir}/config.js`,
    `export default ${JSON.stringify(
      {
        log: 'error',
        source: [`${fixtureDir}/tokens/*.json`],
        platforms: {
          css: {
            transforms: ['attribute/cti'],
            buildPath: `${fixtureDir}/build/`,
            files: [{ destination: 'main.css', format: 'css/variables' }],
          },
        },
      },
      null,
      2,
    )};\n`,
  );
}

describe('logging > collisions > error mode', function () {
  this.timeout(60000);

  before(() => {
    setupFixtures();
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('throws collisions instead of logging them when log level is error', () => {
    const { status, stdout, output } = runStyleDictionary([
      'build',
      '--config',
      `${fixtureDir}/config.js`,
    ]);
    // in error mode the build must fail rather than warn...
    expect(status).to.not.equal(0);
    expect(output).to.match(/collision/i);
    // ...and the collision must not be written to the console as a warning
    expect(stdout).to.not.match(/collision/i);
    // the build was aborted, so no output file was produced
    expect(fileExists(`${fixtureDir}/build/main.css`, fs)).to.be.false;
  });
});
