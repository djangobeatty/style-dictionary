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
import { fileURLToPath } from 'node:url';

const binPath = fileURLToPath(new URL('../bin/style-dictionary.js', import.meta.url));

function runCli(args) {
  const result = childProcess.spawnSync(process.execPath, [binPath, ...args], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

/**
 * The CLI's --help output must list the given flag together with a short
 * description of what it does, e.g.:
 *   --verbose   show verbose output
 */
function expectFlagDescribed(help, flag) {
  const line = help.split('\n').find((l) => l.includes(flag));
  expect(line, `expected --help to list ${flag}, got:\n${help}`).to.be.a('string');
  const description = line.slice(line.indexOf(flag) + flag.length).trim();
  expect(description, `expected a short description next to ${flag} on help line: ${line}`)
    .to.be.a('string')
    .and.to.not.equal('');
}

describe('cli help verbosity flags', function () {
  this.timeout(60000);

  let buildHelp;
  let cleanHelp;

  before(() => {
    buildHelp = runCli(['build', '--help']);
    cleanHelp = runCli(['clean', '--help']);
  });

  it('build --help lists --verbose with a description', () => {
    expectFlagDescribed(buildHelp, '--verbose');
  });

  it('build --help lists --silent with a description', () => {
    expectFlagDescribed(buildHelp, '--silent');
  });

  it('clean --help lists --verbose with a description', () => {
    expectFlagDescribed(cleanHelp, '--verbose');
  });

  it('clean --help lists --silent with a description', () => {
    expectFlagDescribed(cleanHelp, '--silent');
  });
});
