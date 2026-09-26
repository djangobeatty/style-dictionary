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
import { buildPath, cleanConsoleOutput } from '../_constants.js';
import { clearOutput } from '../../__tests__/__helpers.js';
/**
 * The last and final level of logging: file.
 * These logs happen when a file is being built and will notify the user
 * if there are issues generating a file. These issues might include
 * skipping building an empty file, property name collisions, or filtered
 * out references.
 */
describe(`integration`, () => {
  let stub;
  beforeEach(() => {
    stub = stubMethod(console, 'log');
  });
  afterEach(() => {
    restore();
    clearOutput(buildPath);
  });

  describe(`logging`, () => {
    describe(`file`, () => {
      it(`should warn user empty tokens`, async () => {
        const sd = new StyleDictionary({
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              transformGroup: `css`,
              files: [
                {
                  destination: `empty.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `foo`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        const consoleOutput = logs.map(cleanConsoleOutput).join('\n');
        await expect(consoleOutput).to.matchSnapshot();
      });

      it(`should not log anything about a file that is not created when silent`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: `silent` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              transformGroup: `css`,
              files: [
                {
                  destination: `empty.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `foo`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();
        expect(stub.called).to.be.false;
      });

      /**
       * `nameCollisions` and `filteredReferences` each have their own platform config
       * because the log config is what these tests vary.
       */
      const nameCollisionsPlatform = {
        css: {
          // no name transform means there will be name collisions
          transforms: [`attribute/cti`],
          buildPath,
          files: [
            {
              destination: `nameCollisions.css`,
              format: `css/variables`,
              filter: (token) => token.type === `color`,
            },
          ],
        },
      };

      const filteredReferencesPlatform = {
        css: {
          transformGroup: `css`,
          buildPath,
          files: [
            {
              destination: `filteredReferences.css`,
              format: `css/variables`,
              options: {
                outputReferences: true,
              },
              // background colors have references, only including them
              // should warn the user
              filter: (token) => token.attributes.type === `background`,
            },
          ],
        },
      };

      it(`should warn user of name collisions`, async () => {
        const sd = new StyleDictionary({
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: nameCollisionsPlatform,
        });
        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        const consoleOutput = logs.map(cleanConsoleOutput).join('\n');
        await expect(consoleOutput).to.matchSnapshot();
      });

      it(`should list every name collision and the file it came from when verbose`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: `verbose` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              ...nameCollisionsPlatform.css,
              files: [
                {
                  ...nameCollisionsPlatform.css.files[0],
                  // a narrow filter, the full set of colors generates hundreds of collisions
                  filter: (token) =>
                    [`green`, `neutral`].includes(token.path[2]) &&
                    [`0`, `100`].includes(token.path[3]),
                },
              ],
            },
          },
        });
        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        const consoleOutput = logs.map(cleanConsoleOutput).join('\n');
        await expect(consoleOutput).to.matchSnapshot();
      });

      it(`should not warn user of name collisions with warnings set to error`, async () => {
        const sd = new StyleDictionary({
          log: { warnings: `error` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: nameCollisionsPlatform,
        });
        let error;
        try {
          await sd.buildAllPlatforms();
        } catch (e) {
          error = e;
        }
        await expect(cleanConsoleOutput(error.message)).to.matchSnapshot();
        // only log is the platform name at the start of the buildPlatform method
        expect(stub.callCount).to.equal(1);
        expect(stub.firstCall.args).to.eql(['\ncss']);
      });

      it(`should still report the created file when warnings are disabled`, async () => {
        const sd = new StyleDictionary({
          log: { warnings: `disabled` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: nameCollisionsPlatform,
        });
        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        expect(logs.map(cleanConsoleOutput)).to.eql([
          '\ncss',
          `✔︎ ${buildPath}nameCollisions.css`,
        ]);
      });

      it(`should warn user of filtered references`, async () => {
        const sd = new StyleDictionary({
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: filteredReferencesPlatform,
        });
        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        const consoleOutput = logs.map(cleanConsoleOutput).join('\n');
        await expect(consoleOutput).to.matchSnapshot();
      });

      it(`should list every filtered out reference when verbose`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: `verbose` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: filteredReferencesPlatform,
        });
        await sd.buildAllPlatforms();
        const logs = Array.from(stub.calls).flatMap((call) => call.args);
        const consoleOutput = logs.map(cleanConsoleOutput).join('\n');
        await expect(consoleOutput).to.matchSnapshot();
      });

      it(`should not warn user of filtered references with warnings set to error`, async () => {
        const sd = new StyleDictionary({
          log: { warnings: `error` },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: filteredReferencesPlatform,
        });
        let error;
        try {
          await sd.buildAllPlatforms();
        } catch (e) {
          error = e;
        }
        await expect(cleanConsoleOutput(error.message)).to.matchSnapshot();
        // only log is the platform name at the start of the buildPlatform method
        expect(stub.callCount).to.equal(1);
        expect(stub.firstCall.args).to.eql(['\ncss']);
      });

      describe(`clean`, () => {
        const config = (log) => ({
          log,
          tokens: { color: { red: { value: `#f00`, type: `color` } } },
          platforms: {
            css: {
              transformGroup: `css`,
              buildPath,
              files: [{ destination: `variables.css`, format: `css/variables` }],
            },
          },
        });

        const consoleOutput = () =>
          Array.from(stub.calls)
            .flatMap((call) => call.args)
            .map(cleanConsoleOutput);

        it(`should report removed files`, async () => {
          const sd = new StyleDictionary(config());
          await sd.buildAllPlatforms();
          stub.reset();
          await sd.cleanAllPlatforms();
          expect(consoleOutput()).to.include(`- ${buildPath}variables.css`);
        });

        it(`should report files that cannot be removed because they don't exist`, async () => {
          const sd = new StyleDictionary(config());
          await sd.cleanAllPlatforms();
          expect(consoleOutput()).to.include(`! ${buildPath}variables.css, does not exist`);
        });

        it(`should not report removed files when silent`, async () => {
          const sd = new StyleDictionary(config({ verbosity: `silent` }));
          await sd.buildAllPlatforms();
          await sd.cleanAllPlatforms();
          expect(stub.called).to.be.false;
        });
      });
    });
  });
});
