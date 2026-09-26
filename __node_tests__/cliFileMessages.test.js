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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-file-msgs-'));
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

describe('build and clean file messages', function () {
  this.timeout(60000);

  let projectDir;

  const tokensFile = () => path.join(projectDir, 'build', 'tokens.css');
  const emptyFile = () => path.join(projectDir, 'build', 'empty.css');

  before(() => {
    projectDir = makeProject({
      'config.json': {
        source: ['tokens/main.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [
              { destination: 'tokens.css', format: 'css/variables' },
              // matches no tokens, so this file is skipped
              { destination: 'empty.css', format: 'css/variables', filter: { type: 'nothing' } },
            ],
          },
        },
      },
      'tokens/main.json': { color: { primary: { value: '#123456' } } },
    });
  });

  after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('prints one-line messages for created and skipped files by default', () => {
    const res = runCli(projectDir, ['build']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(fs.existsSync(tokensFile()), 'expected the tokens file to be created').to.be.true;
    expect(fs.existsSync(emptyFile()), 'expected the empty file to be skipped').to.be.false;

    const lines = res.output.split('\n');
    expect(
      lines.filter((l) => l.includes('build/tokens.css')),
      `expected a single one-line message for the created file, output:\n${res.output}`,
    ).to.have.lengthOf(1);
    const skippedLines = lines.filter((l) => l.includes('empty.css'));
    expect(
      skippedLines,
      `expected a single one-line message for the skipped file, output:\n${res.output}`,
    ).to.have.lengthOf(1);
    expect(skippedLines[0], `skipped message: ${skippedLines[0]}`).to.match(
      /no tokens|not created/i,
    );
    expect(
      lines.some((l) => l.trim() === 'css'),
      `expected the platform header by default, output:\n${res.output}`,
    ).to.be.true;
  });

  it('prints a one-line message for removed files by default', () => {
    const build = runCli(projectDir, ['build']);
    expect(build.status, `expected a successful build, output:\n${build.output}`).to.equal(0);
    const res = runCli(projectDir, ['clean']);
    expect(res.status, `expected a successful clean, output:\n${res.output}`).to.equal(0);
    expect(fs.existsSync(tokensFile()), 'expected the file to be removed').to.be.false;
    expect(
      res.output.split('\n').filter((l) => l.includes('build/tokens.css')),
      `expected a single one-line message for the removed file, output:\n${res.output}`,
    ).to.have.lengthOf(1);
  });

  it('accepts --verbose on clean', () => {
    const build = runCli(projectDir, ['build']);
    expect(build.status, `expected a successful build, output:\n${build.output}`).to.equal(0);
    const res = runCli(projectDir, ['clean', '--verbose']);
    expect(res.status, `expected clean to accept --verbose, output:\n${res.output}`).to.equal(0);
  });

  it('suppresses created and skipped messages with --silent while still building', () => {
    const res = runCli(projectDir, ['build', '--silent']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(
      res.output.trim(),
      `expected no console output with --silent, got:\n${res.output}`,
    ).to.equal('');
    expect(fs.existsSync(tokensFile()), 'expected the file to still be built').to.be.true;
    expect(fs.existsSync(emptyFile()), 'expected the empty file to still be skipped').to.be.false;
  });

  it('suppresses clean output with --silent while still removing files', () => {
    const build = runCli(projectDir, ['build']);
    expect(build.status, `expected a successful build, output:\n${build.output}`).to.equal(0);
    const res = runCli(projectDir, ['clean', '--silent']);
    expect(res.status, `expected a successful clean, output:\n${res.output}`).to.equal(0);
    expect(
      res.output.trim(),
      `expected no console output with --silent, got:\n${res.output}`,
    ).to.equal('');
    expect(fs.existsSync(tokensFile()), 'expected the file to still be removed').to.be.false;
  });
});
