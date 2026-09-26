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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-error-mode-'));
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

/**
 * With log: 'error', collision and filtered-reference warnings must fail the
 * build by throwing: the details end up in the thrown error (stderr) and are
 * never printed as console warnings (stdout) — at any verbosity level.
 */
describe('log: "error" mode at every verbosity', function () {
  this.timeout(60000);

  let valueDir;
  let nameDir;
  let filteredDir;

  before(() => {
    valueDir = makeProject({
      'config.json': {
        log: 'error',
        source: ['tokens/one.json', 'tokens/two.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [{ destination: 'out.css', format: 'css/variables' }],
          },
        },
      },
      'tokens/one.json': { size: { padding: { small: { value: '8px', type: 'dimension' } } } },
      'tokens/two.json': { size: { padding: { small: { value: '4px', type: 'dimension' } } } },
    });
    nameDir = makeProject({
      'config.json': {
        log: 'error',
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
          brand: { primary: { value: '#333333' } },
        },
      },
    });
    filteredDir = makeProject({
      'config.json': {
        log: 'error',
        source: ['tokens/refs.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [
              {
                destination: 'filtered.css',
                format: 'css/variables',
                options: { outputReferences: true },
                filter: { type: 'kept' },
              },
            ],
          },
        },
      },
      'tokens/refs.json': {
        color: {
          base: { value: '#111111', type: 'hidden' },
          border: { value: '1px solid {color.base}', type: 'kept' },
        },
      },
    });
  });

  after(() => {
    fs.rmSync(valueDir, { recursive: true, force: true });
    fs.rmSync(nameDir, { recursive: true, force: true });
    fs.rmSync(filteredDir, { recursive: true, force: true });
  });

  it('throws value collisions instead of printing them by default', () => {
    const res = runCli(valueDir, ['build']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(res.stderr, `expected the collision error, stderr:\n${res.stderr}`).to.match(
      /collision/i,
    );
    expect(res.stdout, `expected no printed collision warning:\n${res.stdout}`).to.not.match(
      /collision/i,
    );
  });

  it('throws value collisions instead of printing them with --verbose', () => {
    const res = runCli(valueDir, ['build', '--verbose']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.stderr,
      `expected the collision error in the thrown failure, stderr:\n${res.stderr}`,
    ).to.match(/collision/i);
    expect(res.stdout, `expected no printed collision warning:\n${res.stdout}`).to.not.match(
      /collision/i,
    );
  });

  it('throws output name collisions instead of printing them with --verbose', () => {
    const res = runCli(nameDir, ['build', '--verbose']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.stderr,
      `expected the collision error in the thrown failure, stderr:\n${res.stderr}`,
    ).to.match(/collision/i);
    expect(res.stdout, `expected no printed collision warning:\n${res.stdout}`).to.not.match(
      /#222222/,
    );
  });

  it('throws filtered outputReferences warnings instead of printing them with --verbose', () => {
    const res = runCli(filteredDir, ['build', '--verbose']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.stderr,
      `expected the filtered references error in the thrown failure, stderr:\n${res.stderr}`,
    ).to.match(/filtered/i);
    expect(res.stdout, `expected no printed filtered warning:\n${res.stdout}`).to.not.match(
      /color\.base/,
    );
  });

  it('throws collision failures even when the build runs with --silent', () => {
    const res = runCli(valueDir, ['build', '--silent']);
    expect(res.status, `expected a failing build, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.stderr,
      `expected the failure to still surface while silent, stderr:\n${res.stderr}`,
    ).to.match(/collision/i);
  });
});
