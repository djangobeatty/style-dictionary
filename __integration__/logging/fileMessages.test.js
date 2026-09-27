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
import { restore, stubMethod } from 'hanbi';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { buildPath, cleanConsoleOutput } from '../_constants.js';

/**
 * File-level progress messages — file created, file removed, and file not
 * created because the filter left it with no tokens — must remain visible
 * by default. They are the user's confirmation that a build or clean
 * actually did something and must not require --verbose.
 */
describe('integration', () => {
  let stubLog;
  let stubWarn;
  let stubError;

  const collectOutput = () =>
    cleanConsoleOutput(
      [stubLog, stubWarn, stubError]
        .flatMap((stub) => Array.from(stub.calls))
        .flatMap((call) => call.args.map((arg) => (typeof arg === 'string' ? arg : String(arg))))
        .join('\n'),
    );

  beforeEach(() => {
    stubLog = stubMethod(console, 'log');
    stubWarn = stubMethod(console, 'warn');
    stubError = stubMethod(console, 'error');
  });

  afterEach(() => {
    restore();
    try {
      fs.rmSync(buildPath, { recursive: true, force: true });
    } catch (e) {
      // best-effort cleanup of build output
    }
  });

  const tokens = {
    color: { red: { value: '#f00' }, blue: { value: '{color.red.value}' } },
  };

  function config(fileOverrides = {}) {
    return {
      tokens,
      platforms: {
        css: {
          transformGroup: 'css',
          buildPath,
          files: [
            {
              destination: 'fileMessages.css',
              format: 'css/variables',
              ...fileOverrides,
            },
          ],
        },
      },
    };
  }

  const builtFile = `${buildPath}fileMessages.css`;

  describe('logging > file messages', () => {
    it('shows the created file by default', async () => {
      const sd = new StyleDictionary(config());
      await sd.buildAllPlatforms();
      const output = collectOutput();

      expect(output).to.include('✔');
      expect(output).to.include('fileMessages.css');
      expect(fs.existsSync(builtFile)).to.be.true;
    });

    it('shows the file-not-created message by default when a file ends up with no tokens', async () => {
      const sd = new StyleDictionary(config({ filter: () => false }));
      await sd.buildAllPlatforms();
      const output = collectOutput();

      expect(output).to.include('fileMessages.css');
      expect(output).to.match(/no tokens|not created/i);
      expect(fs.existsSync(builtFile)).to.be.false;
    });

    it('shows removed and missing file messages by default during clean', async () => {
      const sd = new StyleDictionary(config());
      await sd.buildAllPlatforms();
      expect(fs.existsSync(builtFile)).to.be.true;

      await sd.cleanAllPlatforms();
      expect(collectOutput()).to.include(`- ${builtFile}`);
      expect(fs.existsSync(builtFile)).to.be.false;

      await sd.cleanAllPlatforms();
      expect(collectOutput()).to.include(`${builtFile}, does not exist`);
    });
  });
});
