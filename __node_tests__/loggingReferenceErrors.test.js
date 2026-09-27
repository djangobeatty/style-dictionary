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

const fixtureDir = '__tests__/__output/log-reference-errors';
const missingConfig = `${fixtureDir}/missing-refs.config.json`;
const circularConfig = `${fixtureDir}/circular-refs.config.json`;

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

describe('reference error logging', function () {
  // each test spawns style-dictionary CLI processes
  this.timeout(60000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });

    // three distinct broken references spread across two source files
    writeJson(`${fixtureDir}/tokens-missing/ref-errors-a.json`, {
      color: {
        brokenOne: { value: '{missing.alpha.value}' },
        brokenTwo: { value: '{missing.beta.value}' },
      },
    });
    writeJson(`${fixtureDir}/tokens-missing/ref-errors-b.json`, {
      size: {
        brokenThree: { value: '{missing.gamma.value}' },
      },
    });
    writeJson(missingConfig, {
      source: [`${fixtureDir}/tokens-missing/*.json`],
      platforms: {
        css: {
          buildPath: `${fixtureDir}/build/`,
          files: [{ destination: 'missing.css', format: 'css/variables' }],
        },
      },
    });

    // two independent circular reference chains
    writeJson(`${fixtureDir}/tokens-circular/cycles.json`, {
      color: {
        cycleA1: { value: '{color.cycleA2.value}' },
        cycleA2: { value: '{color.cycleA1.value}' },
        cycleB1: { value: '{color.cycleB2.value}' },
        cycleB2: { value: '{color.cycleB1.value}' },
      },
    });
    writeJson(circularConfig, {
      source: [`${fixtureDir}/tokens-circular/*.json`],
      platforms: {
        css: {
          buildPath: `${fixtureDir}/build/`,
          files: [{ destination: 'circular.css', format: 'css/variables' }],
        },
      },
    });
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('reports reference errors with a concise message by default', () => {
    const { output } = runStyleDictionary(['build', '-c', missingConfig]);
    // the user is told reference problems happened...
    expect(output).to.match(/ref/i);
    // ...but every individual broken reference is not enumerated
    const detailMarkers = ['missing.alpha', 'missing.beta', 'missing.gamma'];
    expect(
      detailMarkers.every((marker) => output.includes(marker)),
      'default output should not list every reference error',
    ).to.be.false;
  });

  it('lists every reference error and its source file when run with --verbose', () => {
    const { output } = runStyleDictionary(['build', '-c', missingConfig, '--verbose']);
    expect(output).to.include('missing.alpha');
    expect(output).to.include('missing.beta');
    expect(output).to.include('missing.gamma');
    // the file each broken reference comes from must be traceable
    expect(output).to.include('ref-errors-a.json');
    expect(output).to.include('ref-errors-b.json');
  });

  it('reports circular references with a concise message by default', () => {
    const { output } = runStyleDictionary(['build', '-c', circularConfig]);
    expect(output).to.match(/ref|circular|cycle/i);
    expect(
      output.includes('cycleA1') && output.includes('cycleB1'),
      'default output should not spell out every circular reference chain',
    ).to.be.false;
  });

  it('traces every circular reference chain when run with --verbose', () => {
    const { output } = runStyleDictionary(['build', '-c', circularConfig, '--verbose']);
    expect(output).to.include('cycleA1');
    expect(output).to.include('cycleA2');
    expect(output).to.include('cycleB1');
    expect(output).to.include('cycleB2');
  });
});
