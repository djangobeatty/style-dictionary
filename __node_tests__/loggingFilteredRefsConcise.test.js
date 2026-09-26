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

const fixtureDir = '__tests__/__output/cli-logging-filt-concise';

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
  // bg tokens reference core tokens; filtering to bg only leaves
  // outputReferences pointing at tokens that are filtered out
  fs.writeFileSync(
    `${fixtureDir}/tokens/colors.json`,
    `${JSON.stringify(
      {
        color: {
          bg: {
            base: { value: '{color.core.white}', type: 'color' },
            accent: { value: '{color.core.blue}', type: 'color' },
            overlay: { value: '{color.core.black}', type: 'color' },
            solid: { value: '#123456', type: 'color' },
          },
          core: {
            white: { value: '#ffffff', type: 'color' },
            blue: { value: '#0000ff', type: 'color' },
            black: { value: '#000000', type: 'color' },
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
            transformGroup: 'css',
            buildPath: `${fixtureDir}/build/`,
            files: [
              {
                destination: 'filtered.css',
                format: 'css/variables',
                options: { outputReferences: true },
                filter: { attributes: { type: 'bg' } },
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

describe('logging > filtered output references > concise by default', function () {
  this.timeout(60000);

  before(() => {
    setupFixtures();
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('shows only a concise warning for filtered out references by default', () => {
    const { status, output } = runStyleDictionary(['build', '--config', `${fixtureDir}/config.js`]);
    // warnings must not fail the build
    expect(status).to.equal(0);
    // users must still be told filtered references are a problem...
    expect(output).to.match(/filter|outputReferences/i);
    // ...but the default output must not dump every affected reference
    expect(output).to.not.include('color.core.white');
    expect(output).to.not.include('color.core.blue');
    expect(output).to.not.include('color.core.black');
  });
});
