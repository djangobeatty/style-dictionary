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

const fixtureDir = '__tests__/__output/cli-logging-coll-verbose';

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
  // and two tokens that produce the same output name (property name collision)
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
        source: [`${fixtureDir}/tokens/*.json`],
        platforms: {
          css: {
            // no name transform means the two "red" tokens collide on output name
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

describe('logging > collisions > verbose', function () {
  this.timeout(60000);

  before(() => {
    setupFixtures();
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('shows every collision when run with --verbose', () => {
    const { output } = runStyleDictionary([
      'build',
      '--config',
      `${fixtureDir}/config.js`,
      '--verbose',
    ]);
    expect(output).to.match(/collision/i);
    // the colliding token path (property value collision)
    expect(output).to.include('size.pad.medium');
    // both tokens behind the colliding output name (property name collision)
    expect(output).to.include('btn.red');
    expect(output).to.include('text.red');
  });
});
