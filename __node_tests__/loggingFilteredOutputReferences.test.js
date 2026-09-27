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
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname } from 'node:path';
import { cleanConsoleOutput } from '../__integration__/_constants.js';

const fixtureDir = '__tests__/__output/log-filtered-output-refs';
const config = `${fixtureDir}/filtered.config.json`;

/**
 * Run the style-dictionary CLI like a user would and return everything
 * that was printed to stdout and stderr plus the exit status.
 */
function runStyleDictionary(args) {
  const result = spawnSync('node', ['./bin/style-dictionary', ...args], { encoding: 'utf-8' });
  const output = cleanConsoleOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return { output, status: result.status };
}

function writeJson(filePath, contents) {
  fs.mkdirSync(dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(contents, null, 2));
}

describe('filtered output reference warning logging', function () {
  // each test spawns style-dictionary CLI processes
  this.timeout(60000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });

    // bg and fg reference base tokens; keeping only bg/fg in the output file
    // while using outputReferences triggers a warning per filtered-out reference
    writeJson(`${fixtureDir}/tokens/filtered.json`, {
      color: {
        base: {
          red: { value: '#ff0000', type: 'base' },
          blue: { value: '#0000ff', type: 'base' },
        },
        bg: { value: '{color.base.red.value}', type: 'accent' },
        fg: { value: '{color.base.blue.value}', type: 'accent' },
      },
    });
    writeJson(config, {
      source: [`${fixtureDir}/tokens/*.json`],
      platforms: {
        css: {
          buildPath: `${fixtureDir}/build/`,
          files: [
            {
              destination: 'filtered.css',
              format: 'css/variables',
              options: {
                outputReferences: true,
              },
              filter: { type: 'accent' },
            },
          ],
        },
      },
    });
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('reports filtered output references with a concise message by default', () => {
    const { output, status } = runStyleDictionary(['build', '-c', config]);
    expect(status).to.equal(0);
    expect(output).to.match(/reference|filter/i);
    expect(
      output.includes('color.base.red') && output.includes('color.base.blue'),
      'default output should not list every filtered-out reference',
    ).to.be.false;
  });

  it('lists every filtered-out output reference when run with --verbose', () => {
    const { output } = runStyleDictionary(['build', '-c', config, '--verbose']);
    expect(output).to.include('color.base.red');
    expect(output).to.include('color.base.blue');
  });
});
