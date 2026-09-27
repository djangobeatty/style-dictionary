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
import { clearOutput } from '../../__tests__/__helpers.js';

/**
 * Token provenance is captured while loading source files, so expanded
 * reference errors must tell the user which file each problematic token lives
 * in — for missing references and for circular reference cycles alike — so
 * that the offending file can be opened without grepping for it.
 */

const fixturePath = `${buildPath}logging-origin-fixtures/`;
const missingRefFile = `${fixturePath}missing-ref-source.json`;
const circularOneFile = `${fixturePath}circular-one-source.json`;
const circularTwoFile = `${fixturePath}circular-two-source.json`;

const logMethods = ['log', 'warn', 'info', 'error'];

function captureConsole() {
  const stubs = logMethods.map((method) => stubMethod(console, method));
  return {
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
    describe(`reference error origins >`, () => {
      let logs;

      before(() => {
        fs.mkdirSync(fixturePath, { recursive: true });
        fs.writeFileSync(
          missingRefFile,
          JSON.stringify({
            color: {
              brand: { value: '{color.base.green.value}', type: 'color' },
            },
          }),
          'utf-8',
        );
        fs.writeFileSync(
          circularOneFile,
          JSON.stringify({
            color: {
              loopOne: { value: '{color.loopTwo.value}', type: 'color' },
            },
          }),
          'utf-8',
        );
        fs.writeFileSync(
          circularTwoFile,
          JSON.stringify({
            color: {
              loopTwo: { value: '{color.loopOne.value}', type: 'color' },
            },
          }),
          'utf-8',
        );
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

      it(`should name the source token file of a missing reference when verbose`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'verbose' },
          source: [missingRefFile],
          platforms: {
            css: {},
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include('color.brand');
        expect(output).to.include('color.base.green');
        // the file the offending token was loaded from
        expect(output).to.include('missing-ref-source.json');
      });

      it(`should name the source token file of every token in a circular cycle when verbose`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'verbose' },
          source: [circularOneFile, circularTwoFile],
          platforms: {
            css: {},
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.match(/circular/i);
        expect(output).to.include('color.loopOne');
        expect(output).to.include('color.loopTwo');
        // both files that take part in the cycle
        expect(output).to.include('circular-one-source.json');
        expect(output).to.include('circular-two-source.json');
      });

      it(`should name the source token file in the thrown error when verbose and warnings are errors`, async () => {
        const sd = new StyleDictionary({
          log: { warnings: 'error', verbosity: 'verbose' },
          source: [missingRefFile],
          platforms: {
            css: {},
          },
        });

        let error;
        try {
          await sd.buildAllPlatforms();
        } catch (e) {
          error = e;
        }

        expect(error).to.be.an('Error');
        const message = cleanConsoleOutput(error.message);
        expect(message).to.include('color.brand');
        expect(message).to.include('color.base.green');
        expect(message).to.include('missing-ref-source.json');
      });
    });
  });
});
