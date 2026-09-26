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

const fixtureDir = '__tests__/__output/cli-logging-ref-chain';

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
  // color.brand.accent -> color.brand.base -> missing.target.one,
  // so the reference chain spans multiple tokens inside one source file
  fs.writeFileSync(
    `${fixtureDir}/tokens/broken-refs.json`,
    `${JSON.stringify(
      {
        color: {
          brand: {
            accent: { value: '{color.brand.base}' },
            base: { value: '{missing.target.one}' },
            danger: { value: '{missing.target.two}' },
            muted: { value: '{missing.target.three}' },
          },
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

describe('logging > reference errors > file and chain attribution', function () {
  this.timeout(60000);

  before(() => {
    setupFixtures();
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('verbose reference errors identify the file and the reference chain', () => {
    const { output } = runStyleDictionary([
      'build',
      '--config',
      `${fixtureDir}/config.js`,
      '--verbose',
    ]);
    // which file the reference error comes from
    expect(output).to.include('broken-refs.json');
    // where in the file it occurs: the token that holds the broken reference
    expect(output).to.include('color.brand.accent');
    // the chain that leads to the missing token, including the intermediate link
    expect(output).to.include('color.brand.base');
    // and the reference that could not be resolved
    expect(output).to.include('missing.target.one');
  });
});
