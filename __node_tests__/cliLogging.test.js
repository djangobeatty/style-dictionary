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
import { clearOutput } from '../__tests__/__helpers.js';

const build = (options = '') =>
  childProcess
    .execSync(
      `node ./bin/style-dictionary build --config __tests__/__configs/collisions.js ${options}`,
    )
    .toString();

describe('cliLogging', () => {
  afterEach(() => {
    clearOutput();
  });

  it('should summarize collisions without any options', () => {
    const output = build();
    expect(output).to.include('Token collisions detected (7):');
    expect(output).to.include('--verbose');
    expect(output).to.not.include('Was:');
  });

  it('should list every collision with --verbose', () => {
    const output = build('--verbose');
    expect(output).to.include('Token collisions detected (7):');
    expect(output).to.include('Was: 0 (__tests__/__tokens/paddings.json)');
    expect(output).to.include('Now: 0 (__tests__/__tokens/_paddings.json)');
  });

  it('should not log anything with --silent', () => {
    expect(build('--silent')).to.equal('');
  });

  it('should not log warnings with --no-warn, but still report created files', () => {
    const output = build('--no-warn');
    expect(output).to.not.include('Token collisions detected');
    expect(output).to.include('__tests__/__output/collisions.css');
  });

  it('should let --silent win over --verbose', () => {
    expect(build('--verbose --silent')).to.equal('');
  });
});
