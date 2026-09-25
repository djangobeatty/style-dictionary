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
import { fs } from 'style-dictionary/fs';
import StyleDictionary from '../lib/StyleDictionary.js';
import { clearOutput, fileExists } from '../__tests__/__helpers.js';

// TypeScript files can only be imported natively by runtimes that support type stripping,
// e.g. Node.js >= 22.18 (or >= 22.6 with --experimental-strip-types), Bun and Deno.
// On runtimes without support we skip these tests rather than failing.
const supportsTypeScript = await import(
  '../__tests__/__json_files/typescript/module_exports_object.ts'
)
  .then(() => true)
  .catch(() => false);

const describeTypeScript = supportsTypeScript ? describe : describe.skip;

describeTypeScript('buildFromTypeScript', () => {
  const buildPath = '__tests__/__output/typescript/';

  afterEach(() => {
    clearOutput(buildPath);
  });

  it('should build tokens from .ts source files', async () => {
    const sd = new StyleDictionary({
      source: ['__tests__/__json_files/typescript/*.ts'],
      platforms: {
        css: {
          transformGroup: 'css',
          buildPath,
          files: [{ destination: 'variables.css', format: 'css/variables' }],
        },
      },
    });
    await sd.hasInitialized;
    await sd.buildAllPlatforms();

    expect(fileExists(`${buildPath}variables.css`, fs)).to.be.true;
    const output = fs.readFileSync(`${buildPath}variables.css`, 'utf-8');
    expect(output).to.contain('--foo: bar;');
    expect(output).to.contain('--bar: bar;');
  });

  it('should build tokens from a .ts config file', async () => {
    const sd = new StyleDictionary('__tests__/__configs/test.ts');
    await sd.hasInitialized;
    await sd.buildAllPlatforms();

    expect(fileExists(`${buildPath}variables-from-config.css`, fs)).to.be.true;
    const output = fs.readFileSync(`${buildPath}variables-from-config.css`, 'utf-8');
    expect(output).to.contain('--foo: bar;');
  });
});
