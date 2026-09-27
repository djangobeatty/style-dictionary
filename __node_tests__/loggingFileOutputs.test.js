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

const fixtureDir = '__tests__/__output/log-file-outputs';
const config = `${fixtureDir}/files.config.json`;
const builtCreated = `${fixtureDir}/build/created.css`;
const builtEmpty = `${fixtureDir}/build/empty.css`;

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

/**
 * --silent means no logs at all: none of the log lines that a default
 * build or clean run is known to print may appear in the output.
 */
function expectNoLogs(output) {
  expect(output).to.not.include('✔︎');
  expect(output).to.not.match(/^- /m);
  expect(output).to.not.match(/does not exist/i);
  expect(output).to.not.match(/no tokens/i);
  expect(output).to.not.match(/^css$/m);
}

describe('file lifecycle logging', function () {
  // each test spawns style-dictionary CLI processes
  this.timeout(60000);

  before(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });

    writeJson(`${fixtureDir}/tokens/filelog-tokens.json`, {
      color: { base: { red: { value: '#ff0000' } } },
    });
    // one file builds normally, the other ends up with zero tokens after filtering
    writeJson(config, {
      source: [`${fixtureDir}/tokens/*.json`],
      platforms: {
        css: {
          buildPath: `${fixtureDir}/build/`,
          files: [
            { destination: 'created.css', format: 'css/variables' },
            {
              destination: 'empty.css',
              format: 'css/variables',
              filter: { type: 'nonexistent' },
            },
          ],
        },
      },
    });
  });

  after(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('shows created files by default', () => {
    const { output, status } = runStyleDictionary(['build', '-c', config]);
    expect(status).to.equal(0);
    expect(output).to.include('✔︎');
    expect(output).to.include('created.css');
    expect(fs.existsSync(builtCreated)).to.be.true;
  });

  it('does not show created files, or anything else, when run with --silent', () => {
    const { output, status } = runStyleDictionary(['build', '-c', config, '--silent']);
    expect(status).to.equal(0);
    // the build still happened, only the logging was silenced
    expect(fs.existsSync(builtCreated)).to.be.true;
    expect(fs.existsSync(builtEmpty)).to.be.false;
    expectNoLogs(output);
  });

  it('shows a notice when a file is not created because it has no tokens', () => {
    const { output, status } = runStyleDictionary(['build', '-c', config]);
    expect(status).to.equal(0);
    expect(output).to.include('empty.css');
    expect(output).to.match(/no tokens|not created/i);
    expect(fs.existsSync(builtEmpty)).to.be.false;
  });

  it('hides the no-tokens notice when run with --silent', () => {
    const { output, status } = runStyleDictionary(['build', '-c', config, '--silent']);
    expect(status).to.equal(0);
    expect(fs.existsSync(builtEmpty)).to.be.false;
    expect(output).to.not.match(/no tokens/i);
    expect(output).to.not.include('empty.css');
  });

  it('shows removed files when running clean', () => {
    runStyleDictionary(['build', '-c', config]);
    const { output, status } = runStyleDictionary(['clean', '-c', config]);
    expect(status).to.equal(0);
    expect(output).to.match(/- .*created\.css/);
    expect(fs.existsSync(builtCreated)).to.be.false;
  });

  it('does not show removed files, or anything else, when running clean with --silent', () => {
    runStyleDictionary(['build', '-c', config]);
    expect(fs.existsSync(builtCreated)).to.be.true;
    const { output, status } = runStyleDictionary(['clean', '-c', config, '--silent']);
    expect(status).to.equal(0);
    // the file was still removed, only the logging was silenced
    expect(fs.existsSync(builtCreated)).to.be.false;
    expectNoLogs(output);
  });
});
