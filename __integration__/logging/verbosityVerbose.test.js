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
 * The "verbose" verbosity level: every individual occurrence of every noisy
 * warning category must be printed, with at least the detail that was
 * available before the summary behaviour was introduced.
 */

const fixturePath = `${buildPath}logging-verbose-fixtures/`;
const brokenRefsFile = `${fixturePath}broken-refs.json`;

const brokenRefs = {
  color: {
    brand: { value: '{color.base.green.value}', type: 'color' },
    accent: { value: '{color.base.blue.value}', type: 'color' },
  },
  size: {
    gutter: { value: '{size.missing.value}', type: 'dimension' },
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
    describe(`verbose verbosity >`, () => {
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

      it(`should print every token name collision occurrence`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'verbose' },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              // no name transform means there will be name collisions
              transforms: [`attribute/cti`],
              buildPath,
              files: [
                {
                  destination: `verboseNameCollisions.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `color`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include('verboseNameCollisions.css');
        // contributing token paths and their values, for the first colliding
        // output name, the last one, and a non-numeric one in between
        expect(output).to.include('color.core.green.0');
        expect(output).to.include('#ebf9eb');
        expect(output).to.include('color.core.yellow.1100');
        expect(output).to.include('#2d1a05');
        expect(output).to.include('color.background.disabled');
        expect(output).to.include('color.font.interactive.disabled');
      });

      it(`should print every filtered out reference occurrence`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'verbose' },
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              transformGroup: `css`,
              buildPath,
              files: [
                {
                  destination: `verboseFilteredReferences.css`,
                  format: `css/variables`,
                  options: {
                    outputReferences: true,
                  },
                  filter: (token) => token.attributes.type === `background`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include('verboseFilteredReferences.css');
        // all 7 references that are used but not defined in the file
        [
          'color.core.neutral.100',
          'color.core.neutral.0',
          'color.core.neutral.200',
          'color.core.red.0',
          'color.core.orange.0',
          'color.core.green.0',
          'color.core.blue.0',
        ].forEach((reference) => {
          expect(output).to.include(reference);
        });
      });

      it(`should print every reference error occurrence`, async () => {
        const sd = new StyleDictionary({
          log: { verbosity: 'verbose' },
          source: [brokenRefsFile],
          platforms: {
            css: {},
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        // the token that is referencing
        expect(output).to.include('color.brand');
        expect(output).to.include('color.accent');
        expect(output).to.include('size.gutter');
        // and the reference that could not be found
        expect(output).to.include('color.base.green');
        expect(output).to.include('color.base.blue');
        expect(output).to.include('size.missing');
      });
    });
  });
});
