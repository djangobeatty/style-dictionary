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

const fixtureDir = '__tests__/__output/log-collisions';
const valueConfig = `${fixtureDir}/value-collisions.config.json`;
const valueErrorConfig = `${fixtureDir}/value-collisions-error.config.json`;
const namesConfig = `${fixtureDir}/name-collisions.config.json`;
const namesErrorConfig = `${fixtureDir}/name-collisions-error.config.json`;

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

describe('collision warning logging', function () {
  // each test spawns style-dictionary CLI processes
  this.timeout(60000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });

    // two source files that claim the same token paths with different values,
    // producing two property value collisions on merge
    writeJson(`${fixtureDir}/tokens/collision-a.json`, {
      color: { dupe: { value: '#111111' } },
      size: { dupe: { value: '#aaaaaa' } },
    });
    writeJson(`${fixtureDir}/tokens/collision-b.json`, {
      color: { dupe: { value: '#222222' } },
      size: { dupe: { value: '#bbbbbb' } },
    });
    const valueSources = [
      `${fixtureDir}/tokens/collision-a.json`,
      `${fixtureDir}/tokens/collision-b.json`,
    ];
    writeJson(valueConfig, { source: valueSources, platforms: {} });
    writeJson(valueErrorConfig, { log: 'error', source: valueSources, platforms: {} });

    // without name transforms the output names are the leaf keys, so
    // color.red collides with background.red and color.blue with background.blue,
    // producing two property name collisions in one file
    writeJson(`${fixtureDir}/tokens/names.json`, {
      color: { red: { value: '#ff0000' }, blue: { value: '#0000ff' } },
      background: { red: { value: '#ffaaaa' }, blue: { value: '#aaaaff' } },
    });
    const namesSource = [`${fixtureDir}/tokens/names.json`];
    const namesPlatform = {
      css: {
        buildPath: `${fixtureDir}/build/`,
        files: [{ destination: 'names.css', format: 'css/variables' }],
      },
    };
    writeJson(namesConfig, { source: namesSource, platforms: namesPlatform });
    writeJson(namesErrorConfig, {
      log: 'error',
      source: namesSource,
      platforms: namesPlatform,
    });
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('summarizes property value collisions by default', () => {
    const { output, status } = runStyleDictionary(['build', '-c', valueConfig]);
    expect(status).to.equal(0);
    expect(output).to.match(/collis/i);
    expect(
      output.includes('#111111') && output.includes('#aaaaaa'),
      'default output should not list every value collision',
    ).to.be.false;
  });

  it('lists every property value collision when run with --verbose', () => {
    const { output } = runStyleDictionary(['build', '-c', valueConfig, '--verbose']);
    expect(output).to.include('color.dupe');
    expect(output).to.include('size.dupe');
    expect(output).to.include('#222222');
    expect(output).to.include('#bbbbbb');
  });

  it('summarizes token name collisions by default', () => {
    const { output, status } = runStyleDictionary(['build', '-c', namesConfig]);
    expect(status).to.equal(0);
    expect(output).to.match(/collis/i);
    expect(
      output.includes('#ff0000') && output.includes('#0000ff'),
      'default output should not list every name collision',
    ).to.be.false;
  });

  it('lists every token name collision when run with --verbose', () => {
    const { output } = runStyleDictionary(['build', '-c', namesConfig, '--verbose']);
    expect(output).to.include('color.red');
    expect(output).to.include('background.red');
    expect(output).to.include('color.blue');
    expect(output).to.include('background.blue');
    expect(output).to.include('#ff0000');
  });

  it('throws instead of warning when log level is error and value collisions occur', () => {
    const { output, status } = runStyleDictionary(['build', '-c', valueErrorConfig]);
    expect(status).to.not.equal(0);
    expect(output).to.match(/collis/i);
  });

  it('throws instead of warning when log level is error and name collisions occur', () => {
    const { output, status } = runStyleDictionary(['build', '-c', namesErrorConfig]);
    expect(status).to.not.equal(0);
    expect(output).to.match(/collis/i);
  });

  it('prints nothing at all for collisions when run with --silent', () => {
    const { output, status } = runStyleDictionary(['build', '-c', valueConfig, '--silent']);
    expect(status).to.equal(0);
    expect(output.trim()).to.equal('');
  });
});
