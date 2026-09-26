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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const binPath = fileURLToPath(new URL('../bin/style-dictionary.js', import.meta.url));

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-silent-'));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2),
    );
  }
  return dir;
}

function runCli(dir, args) {
  const result = childProcess.spawnSync(process.execPath, [binPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

describe('silent mode', function () {
  this.timeout(60000);

  let warnDir;
  let refDir;

  before(() => {
    // produces collision warnings during the build
    warnDir = makeProject({
      'config.json': {
        source: ['tokens/names.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [{ destination: 'names.css', format: 'css/variables' }],
          },
        },
      },
      'tokens/names.json': {
        color: {
          background: { primary: { value: '#111111' } },
          border: { primary: { value: '#222222' } },
        },
      },
    });
    // produces reference errors that fail the build
    refDir = makeProject({
      'config.json': {
        source: ['tokens/*.json'],
        platforms: { css: {} },
      },
      'tokens/refs.json': {
        color: { danger: { value: '{color.red}' } },
      },
    });
  });

  after(() => {
    fs.rmSync(warnDir, { recursive: true, force: true });
    fs.rmSync(refDir, { recursive: true, force: true });
  });

  it('suppresses platform headers and warning messages, unlike the default build', () => {
    const loud = runCli(warnDir, ['build']);
    expect(loud.status, `expected a successful build, output:\n${loud.output}`).to.equal(0);
    expect(
      loud.output,
      `expected the platform header by default, output:\n${loud.output}`,
    ).to.match(/\ncss\n/);
    expect(loud.output, `expected collision warnings by default, output:\n${loud.output}`).to.match(
      /collision/i,
    );

    const quiet = runCli(warnDir, ['build', '--silent']);
    expect(quiet.status, `expected a successful build, output:\n${quiet.output}`).to.equal(0);
    expect(
      quiet.output.trim(),
      `expected no console output with --silent, got:\n${quiet.output}`,
    ).to.equal('');
    expect(
      fs.existsSync(path.join(warnDir, 'build', 'names.css')),
      'expected the file to still be built',
    ).to.be.true;
  });

  it('still surfaces build failures when the build runs with --silent', () => {
    const res = runCli(refDir, ['build', '--silent']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.output,
      `expected the failure to still surface while silent, output:\n${res.output}`,
    ).to.not.equal('');
  });
});
