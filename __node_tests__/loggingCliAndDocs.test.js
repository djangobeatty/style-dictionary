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

/**
 * Verbosity has to be selectable from the CLI as well as from configuration,
 * and the available levels have to be documented alongside the other
 * configuration options.
 */

const cliRoot = '__integration__/build/cli-logging/';
const tokensDir = `${cliRoot}tokens/`;
const outputDir = `${cliRoot}output/`;
const configFile = `${cliRoot}config.json`;
const outputFile = `${outputDir}vars.css`;

// two tokens whose last path segment is identical, combined with a platform
// that has no name transform, so both end up with the output name "base"
const tokens = {
  color: {
    groupA: { base: { value: '#ff0000', type: 'color' } },
    groupB: { base: { value: '#00ff00', type: 'color' } },
  },
};

const config = {
  source: [`${tokensDir}*.json`],
  platforms: {
    css: {
      transforms: ['attribute/cti'],
      buildPath: outputDir,
      files: [
        {
          destination: 'vars.css',
          format: 'css/variables',
        },
      ],
    },
  },
};

// strip the SGR escape sequences chalk emits, so we compare readable strings
const ansiRegex = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');
const stripAnsi = (str) => `${str}`.replace(ansiRegex, '');

const runBuild = (...args) =>
  spawnSync('node', ['./bin/style-dictionary', 'build', '--config', configFile, ...args], {
    encoding: 'utf-8',
  });

describe('logging > cli and documentation', () => {
  beforeEach(() => {
    fs.mkdirSync(tokensDir, { recursive: true });
    fs.writeFileSync(`${tokensDir}colors.json`, JSON.stringify(tokens), 'utf-8');
    fs.writeFileSync(configFile, JSON.stringify(config), 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(cliRoot, { recursive: true, force: true });
  });

  it('should summarise warnings when the CLI is given no verbosity flag', () => {
    const result = runBuild();

    expect(result.status).to.equal(0);
    const output = stripAnsi(`${result.stdout}${result.stderr}`);
    expect(output).to.match(/collision/i);
    expect(output).to.match(/verbose/i);
    // the individual occurrences are withheld
    expect(output).to.not.include('color.groupA.base');
    expect(output).to.not.include('color.groupB.base');
    expect(fs.existsSync(outputFile)).to.be.true;
  });

  it('should print every occurrence when the CLI is given --verbose', () => {
    const result = runBuild('--verbose');

    expect(result.status).to.equal(0);
    const output = stripAnsi(`${result.stdout}${result.stderr}`);
    expect(output).to.match(/collision/i);
    expect(output).to.include('color.groupA.base');
    expect(output).to.include('#ff0000');
    expect(output).to.include('color.groupB.base');
    expect(output).to.include('#00ff00');
    expect(fs.existsSync(outputFile)).to.be.true;
  });

  it('should print nothing when the CLI is given --silent', () => {
    const result = runBuild('--silent');

    expect(result.status).to.equal(0);
    expect(stripAnsi(result.stdout).trim()).to.equal('');
    expect(stripAnsi(result.stderr)).to.not.match(/collision/i);
    // silencing the output does not silence the build
    expect(fs.existsSync(outputFile)).to.be.true;
  });

  it('should document the verbosity flags in the CLI help', () => {
    const result = spawnSync('node', ['./bin/style-dictionary', 'build', '--help'], {
      encoding: 'utf-8',
    });

    expect(result.status).to.equal(0);
    const output = stripAnsi(`${result.stdout}${result.stderr}`);
    expect(output).to.include('--verbose');
    expect(output).to.include('--silent');
  });

  it('should document the verbosity levels alongside the other configuration options', () => {
    const docs = fs.readFileSync('docs/config.md', 'utf-8');

    // the log option itself
    expect(docs).to.match(/\blog\b/);
    // and the levels it accepts
    expect(docs).to.match(/verbosity/i);
    expect(docs).to.match(/\bsilent\b/i);
    expect(docs).to.match(/\bverbose\b/i);
  });
});
