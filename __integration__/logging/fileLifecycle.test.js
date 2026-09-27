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
import { clearOutput, fileExists } from '../../__tests__/__helpers.js';

/**
 * Routine file lifecycle messages — files created, files removed and files
 * skipped because no tokens survived filtering — are not "noise". They stay
 * visible at both the default and the verbose verbosity level and only
 * disappear when logging is silenced.
 */

const lifecyclePath = `${buildPath}lifecycle/`;
const createdFile = `${lifecyclePath}created.css`;
const skippedFile = `${lifecyclePath}skipped.css`;

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

const makeDictionary = (log) =>
  new StyleDictionary({
    ...(log ? { log } : {}),
    source: [`__integration__/tokens/**/[!_]*.json?(c)`],
    platforms: {
      css: {
        transformGroup: `css`,
        buildPath: lifecyclePath,
        files: [
          {
            destination: `created.css`,
            format: `css/variables`,
          },
          {
            // nothing survives this filter, so the file is skipped
            destination: `skipped.css`,
            format: `css/variables`,
            filter: (token) => token.type === `does-not-exist`,
          },
        ],
      },
    },
  });

describe(`integration >`, () => {
  describe(`logging >`, () => {
    describe(`file lifecycle messages >`, () => {
      let logs;

      beforeEach(() => {
        logs = captureConsole();
      });

      afterEach(() => {
        restore();
        clearOutput(lifecyclePath);
        clearOutput(buildPath);
      });

      it(`should report created and skipped files at default verbosity`, async () => {
        await makeDictionary().buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include(createdFile);
        expect(output).to.include('skipped.css');
        expect(output).to.match(/no tokens/i);
        expect(fileExists(createdFile)).to.be.true;
        expect(fileExists(skippedFile)).to.be.false;
      });

      it(`should report created and skipped files at verbose verbosity`, async () => {
        await makeDictionary({ verbosity: 'verbose' }).buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include(createdFile);
        expect(output).to.include('skipped.css');
        expect(output).to.match(/no tokens/i);
        expect(fileExists(createdFile)).to.be.true;
        expect(fileExists(skippedFile)).to.be.false;
      });

      it(`should report removed files at default verbosity`, async () => {
        const sd = makeDictionary();
        await sd.buildAllPlatforms();
        expect(fileExists(createdFile)).to.be.true;

        // only look at what cleaning logs
        restore();
        logs = captureConsole();
        await sd.cleanAllPlatforms();

        expect(logs.output).to.include(createdFile);
        expect(fileExists(createdFile)).to.be.false;
      });

      it(`should report removed files at verbose verbosity`, async () => {
        const sd = makeDictionary({ verbosity: 'verbose' });
        await sd.buildAllPlatforms();
        expect(fileExists(createdFile)).to.be.true;

        // only look at what cleaning logs
        restore();
        logs = captureConsole();
        await sd.cleanAllPlatforms();

        expect(logs.output).to.include(createdFile);
        expect(fileExists(createdFile)).to.be.false;
      });

      it(`should suppress created, skipped and removed messages at silent verbosity`, async () => {
        const sd = makeDictionary({ verbosity: 'silent' });
        await sd.buildAllPlatforms();
        expect(fileExists(createdFile)).to.be.true;

        await sd.cleanAllPlatforms();
        expect(fileExists(createdFile)).to.be.false;

        expect(logs.output).to.equal('');
        expect(logs.callCount).to.equal(0);
      });
    });
  });
});
