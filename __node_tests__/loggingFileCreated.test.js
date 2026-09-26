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

const fixtureDir = '__tests__/__output/cli-logging-created';

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
  fs.writeFileSync(
    `${fixtureDir}/tokens/colors.json`,
    `${JSON.stringify(
      {
        color: {
          red: { value: '#ff0000', type: 'color' },
          blue: { value: '#0000ff', type: 'color' },
        },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    `${fixtureDir}/config.js`,
    `export default ${JSON.stringify(
      {
        source: [`${fixtureDir}/tokens/*.json`],
        platforms: {
          css: {
            transformGroup: 'css',
            buildPath: `${fixtureDir}/build/`,
            files: [
              { destination: 'colors.css', format: 'css/variables' },
              {
                destination: 'empty.css',
                format: 'css/variables',
                filter: { type: 'nonexistent' },
              },
            ],
          },
        },
      },
      null,
      2,
    )};\n`,
  );
}

describe('logging > file created', function () {
  this.timeout(60000);

  before(() => {
    setupFixtures();
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('logs created files unless --silent is passed', () => {
    const normal = runStyleDictionary(['build', '--config', `${fixtureDir}/config.js`]);
    expect(normal.status).to.equal(0);
    // the created file is reported to the user...
    expect(normal.output).to.include('colors.css');
    expect(fileExists(`${fixtureDir}/build/colors.css`, fs)).to.be.true;

    const silent = runStyleDictionary(['build', '--config', `${fixtureDir}/config.js`, '--silent']);
    // ...but with --silent nothing is logged, while the file is still built
    expect(silent.status).to.equal(0);
    expect(silent.output.trim()).to.equal('');
    expect(fileExists(`${fixtureDir}/build/colors.css`, fs)).to.be.true;
  });
});
