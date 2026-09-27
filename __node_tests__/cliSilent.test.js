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
import childProcess from 'child_process';
import fs from 'node:fs';
import { cleanConsoleOutput } from '../__integration__/_constants.js';

/**
 * The CLI's --silent flag must suppress all console output for both build
 * and clean, while the side effects still happen (files created/removed)
 * and errors that would otherwise be thrown are still thrown (non-zero
 * exit). The default (non-silent) runs here also verify that the
 * file-created, file-removed, and file-not-created messages stay visible
 * without --verbose.
 */
const fixtureDir = '__tests__/__output/cli-silent-fixtures';
const outDir = `${fixtureDir}/out`;
const builtFile = `${outDir}/main.css`;

function runCli(args) {
  const result = childProcess.spawnSync('node', ['./bin/style-dictionary.js', ...args], {
    encoding: 'utf-8',
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  // join only the streams that produced something, so that a fully silent
  // run normalizes to the empty string
  const output = cleanConsoleOutput([stdout, stderr].filter((part) => part !== '').join('\n'));
  return {
    status: result.status,
    stdout,
    stderr,
    output,
  };
}

function writeJson(fileName, data) {
  fs.writeFileSync(`${fixtureDir}/${fileName}`, JSON.stringify(data, null, 2));
}

function writeFixtures() {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.mkdirSync(fixtureDir, { recursive: true });

  writeJson('tokens.json', {
    color: {
      red: { value: '#f00' },
      blue: { value: '{color.red.value}' },
    },
  });
  writeJson('broken-tokens.json', {
    color: {
      danger: { value: '{color.missing.value}' },
    },
  });

  writeJson('config-ok.json', {
    source: [`${fixtureDir}/tokens.json`],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${outDir}/`,
        files: [{ destination: 'main.css', format: 'css/variables' }],
      },
    },
  });

  writeJson('config-broken.json', {
    source: [`${fixtureDir}/broken-tokens.json`],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${outDir}/`,
        files: [{ destination: 'broken.css', format: 'css/variables' }],
      },
    },
  });
}

const okConfig = `${fixtureDir}/config-ok.json`;
const brokenConfig = `${fixtureDir}/config-broken.json`;

describe('cli silent', function () {
  this.timeout(120000);

  beforeEach(() => {
    writeFixtures();
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  describe('default (no --silent)', () => {
    it('build: shows the created file message', () => {
      const { status, output } = runCli(['build', '-c', okConfig]);
      expect(status).to.equal(0);
      expect(output).to.include('✔');
      expect(output).to.include('main.css');
      expect(fs.existsSync(builtFile)).to.be.true;
    });

    it('clean: shows the removed file message', () => {
      const build = runCli(['build', '-c', okConfig]);
      expect(build.status).to.equal(0);
      expect(fs.existsSync(builtFile)).to.be.true;

      const { status, output } = runCli(['clean', '-c', okConfig]);
      expect(status).to.equal(0);
      expect(output).to.include(`- ${builtFile}`);
      expect(fs.existsSync(builtFile)).to.be.false;
    });

    it('clean: shows the file-does-not-exist message', () => {
      const { status, output } = runCli(['clean', '-c', okConfig]);
      expect(status).to.equal(0);
      expect(output).to.include(`${builtFile}, does not exist`);
    });
  });

  describe('--silent', () => {
    it('build: prints nothing but still creates the file', () => {
      const { status, output } = runCli(['build', '-c', okConfig, '--silent']);
      expect(status).to.equal(0);
      expect(output).to.equal('');
      expect(fs.existsSync(builtFile)).to.be.true;
    });

    it('clean: prints nothing but still removes the file', () => {
      const build = runCli(['build', '-c', okConfig]);
      expect(build.status).to.equal(0);
      expect(fs.existsSync(builtFile)).to.be.true;

      const { status, output } = runCli(['clean', '-c', okConfig, '--silent']);
      expect(status).to.equal(0);
      expect(output).to.equal('');
      expect(fs.existsSync(builtFile)).to.be.false;
    });

    it('build: still fails when there are reference errors', () => {
      const { status, stdout, stderr } = runCli(['build', '-c', brokenConfig, '--silent']);
      // the error is still thrown -> non-zero exit...
      expect(status).to.not.equal(0);
      // ...while console output stays suppressed
      expect(stdout).to.equal('');
      // and the flag itself was accepted (not rejected as unknown)
      expect(stderr).to.not.include('unknown option');
    });
  });
});
