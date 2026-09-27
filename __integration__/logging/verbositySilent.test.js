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
import { clearOutput, fileExists } from '../../__tests__/__helpers.js';

/**
 * The "silent" verbosity level: absolutely no log output, for CI or when
 * Style Dictionary is embedded in a larger build. Only genuinely fatal
 * conditions still surface, and they surface as thrown errors.
 */

const fixturePath = `${buildPath}logging-silent-fixtures/`;
const brokenRefsFile = `${fixturePath}broken-refs.json`;

const brokenRefs = {
  color: {
    brand: { value: '{color.base.green.value}', type: 'color' },
    accent: { value: '{color.base.blue.value}', type: 'color' },
  },
};

const logMethods = ['log', 'warn', 'info', 'error'];

function captureConsole() {
  const stubs = logMethods.map((method) => stubMethod(console, method));
  return {
    get callCount() {
      return stubs.reduce((total, stub) => total + stub.callCount, 0);
    },
    get output() {
      return stubs
        .flatMap((stub) => Array.from(stub.calls))
        .flatMap((call) => call.args)
        .map((arg) => cleanConsoleOutput(String(arg)))
        .join('\n');
    },
  };
}

describe(`integration >`, () => {
  describe(`logging >`, () => {
    describe(`silent verbosity >`, () => {
      let logs;

      before(() => {
        fs.mkdirSync(fixturePath, { recursive: true });
        fs.writeFileSync(brokenRefsFile, JSON.stringify(brokenRefs), 'utf-8');
      });

      after(() => {
        fs.rmSync(fixturePath, { recursive: true, force: true });
      });

      beforeEach(() => {
        logs = captureConsole();
      });

      afterEach(() => {
        restore();
        clearOutput(buildPath);
      });

      it(`should log nothing for a build with reference errors, name collisions, filtered references, created and skipped files`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'silent' },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`, brokenRefsFile],
          platforms: {
            css: {
              // no name transform means there will be name collisions
              transforms: [`attribute/cti`],
              buildPath,
              files: [
                {
                  destination: `silentNameCollisions.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `color`,
                },
                {
                  destination: `silentFilteredReferences.css`,
                  format: `css/variables`,
                  options: {
                    outputReferences: true,
                  },
                  filter: (token) => token.attributes.type === `background`,
                },
                {
                  // nothing survives this filter, so the file is skipped
                  destination: `silentEmpty.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `does-not-exist`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();

        expect(logs.output).to.equal('');
        expect(logs.callCount).to.equal(0);
        // silencing the logs must not silence the build itself
        expect(fileExists(`${buildPath}silentNameCollisions.css`)).to.be.true;
        expect(fileExists(`${buildPath}silentFilteredReferences.css`)).to.be.true;
        expect(fileExists(`${buildPath}silentEmpty.css`)).to.be.false;
      });

      it(`should log nothing for source value collisions`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'silent' },
          source: [
            // including the same tokens twice throws value collision warnings
            `__integration__/tokens/size/padding.json`,
            `__integration__/tokens/size/_padding.json`,
          ],
          platforms: {},
        });

        await sd.hasInitialized;

        expect(logs.output).to.equal('');
        expect(logs.callCount).to.equal(0);
      });

      it(`should log nothing when cleaning`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'silent' },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              transformGroup: `css`,
              buildPath,
              files: [
                {
                  destination: `silentClean.css`,
                  format: `css/variables`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();
        expect(fileExists(`${buildPath}silentClean.css`)).to.be.true;

        await sd.cleanAllPlatforms();
        expect(fileExists(`${buildPath}silentClean.css`)).to.be.false;

        expect(logs.output).to.equal('');
        expect(logs.callCount).to.equal(0);
      });

      it(`should still surface fatal conditions as thrown errors`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'silent' },
          tokens: {},
          platforms: {
            css: {
              transformGroup: `does-not-exist`,
            },
          },
        });

        let error;
        try {
          await sd.buildAllPlatforms();
        } catch (e) {
          error = e;
        }

        expect(error).to.be.an('Error');
        expect(error.message).to.match(/transformGroup/i);
        expect(error.message).to.include('does-not-exist');
        // the fatal condition was thrown, not logged
        expect(logs.output).to.equal('');
        expect(logs.callCount).to.equal(0);
      });
    });
  });
});
