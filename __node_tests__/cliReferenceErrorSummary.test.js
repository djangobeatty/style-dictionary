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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-ref-summary-'));
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
 * Returns true when the given number occurs within maxGap characters of the
 * given word, in either direction. Used to verify that a concise summary
 * reports how many reference errors were found.
 */
function hasNumberNearWord(text, number, wordPattern, maxGap = 100) {
  const wordIndexes = [];
  const wordRe = new RegExp(wordPattern.source, 'gi');
  let match;
  while ((match = wordRe.exec(text)) !== null) {
    wordIndexes.push(match.index);
  }
  const numRe = new RegExp(`\\b${number}\\b`, 'g');
  while ((match = numRe.exec(text)) !== null) {
    if (wordIndexes.some((i) => Math.abs(i - match.index) <= maxGap)) {
      return true;
    }
  }
  return false;
}

describe('build reference errors at default verbosity', function () {
  this.timeout(60000);

  let projectDir;

  before(() => {
    projectDir = makeProject({
      'config.json': {
        source: ['tokens/*.json'],
        platforms: { css: {} },
      },
      'tokens/refs.json': {
        color: {
          alpha: { value: '{color.missingOne}' },
          beta: { value: '{color.missingTwo}' },
        },
      },
    });
  });

  after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('fails the build and reports a concise count of reference errors pointing at --verbose', () => {
    const res = runCli(projectDir, ['build']);
    expect(res.status, `expected the build to fail, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.output,
      `expected an indication to re-run with --verbose, output:\n${res.output}`,
    ).to.match(/--verbose/);
    expect(
      hasNumberNearWord(res.output, 2, /reference/i),
      `expected the number of reference errors (2) to be reported, output:\n${res.output}`,
    ).to.be.true;
  });

  it('does not print the full list of reference errors without --verbose', () => {
    const res = runCli(projectDir, ['build']);
    expect(res.status, `expected the build to fail, output:\n${res.output}`).to.not.equal(0);
    expect(
      res.output,
      `expected the missing reference details to be omitted by default:\n${res.output}`,
    ).to.not.match(/missingOne/);
    expect(res.output).to.not.match(/missingTwo/);
    expect(res.output).to.not.match(/tries to reference/);
  });
});
