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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-verbose-refs-'));
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

describe('build reference errors with --verbose', function () {
  this.timeout(60000);

  let projectDir;
  let buildResult;

  before(() => {
    projectDir = makeProject({
      'config.json': {
        source: ['tokens/*.json'],
        platforms: { css: {} },
      },
      // color.alpha reaches the broken reference through color.beta
      'tokens/chain.json': {
        color: { alpha: { value: '{color.beta}' } },
      },
      // color.beta directly contains the broken reference
      'tokens/broken.json': {
        color: { beta: { value: '{color.missing}' } },
      },
      'tokens/circular.json': {
        size: { one: { value: '{size.two}' }, two: { value: '{size.one}' } },
      },
    });
    buildResult = runCli(projectDir, ['build', '--verbose']);
  });

  after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('still fails the build but lists every reference error with its source file', () => {
    const res = buildResult;
    expect(res.status, `expected the build to fail, output:\n${res.output}`).to.not.equal(0);
    // missing reference: named with the file of the token holding the broken reference
    expect(
      res.output,
      `expected the source file of the token with the broken reference, output:\n${res.output}`,
    ).to.match(/broken\.json/);
    expect(res.output, `expected the missing reference to be listed:\n${res.output}`).to.match(
      /color\.missing/,
    );
    // circular definition cycle: named with the file of the cycling tokens
    expect(
      res.output,
      `expected the source file of the tokens in the circular cycle, output:\n${res.output}`,
    ).to.match(/circular\.json/);
    expect(res.output, `expected the cycle members to be listed:\n${res.output}`).to.match(
      /size\.one/,
    );
    expect(res.output).to.match(/size\.two/);
  });

  it('shows the chain of token paths that led to the broken reference', () => {
    const res = buildResult;
    expect(res.status, `expected the build to fail, output:\n${res.output}`).to.not.equal(0);
    const chainLine = res.output
      .split('\n')
      .find(
        (l) => l.includes('color.alpha') && l.includes('color.beta') && l.includes('color.missing'),
      );
    expect(
      chainLine,
      `expected a single line showing the reference chain of token paths, output:\n${res.output}`,
    ).to.be.a('string');
  });
});
