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
 * The "default" verbosity level: noisy warning categories (reference errors,
 * token name collisions and filtered out output references) must collapse into
 * a concise summary that names the category, says how many occurrences there
 * are and tells the user how to see the details, rather than printing one
 * entry per occurrence.
 */

const fixturePath = `${buildPath}logging-default-fixtures/`;
const brokenRefsFile = `${fixturePath}broken-refs.json`;

// exactly three broken references, spread over two token groups
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

const nonEmptyLines = (output) => output.split('\n').filter((line) => line !== '');

describe(`integration >`, () => {
  describe(`logging >`, () => {
    describe(`default verbosity >`, () => {
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

      it(`should summarise token name collisions instead of listing every occurrence`, async () => {
        const sd = new StyleDictionary({
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              // no name transform means there will be name collisions
              transforms: [`attribute/cti`],
              buildPath,
              files: [
                {
                  destination: `defaultNameCollisions.css`,
                  format: `css/variables`,
                  filter: (token) => token.type === `color`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include('defaultNameCollisions.css');
        expect(output).to.match(/collision/i);
        expect(output).to.match(/\d/);
        expect(output).to.match(/verbose/i);
        // none of the ~19 colliding names nor their contributing tokens/values
        expect(output).to.not.include('color.core.green.0');
        expect(output).to.not.include('#ebf9eb');
        expect(output).to.not.include('color.core.yellow.1100');
        expect(output).to.not.include('color.font.interactive.disabled');
        expect(nonEmptyLines(output).length).to.be.at.most(10);
      });

      it(`should summarise filtered out references instead of listing every occurrence`, async () => {
        const sd = new StyleDictionary({
          source: [`__integration__/tokens/**/[!_]*.json?(c)`],
          platforms: {
            css: {
              transformGroup: `css`,
              buildPath,
              files: [
                {
                  destination: `defaultFilteredReferences.css`,
                  format: `css/variables`,
                  options: {
                    outputReferences: true,
                  },
                  // background colors have references, only including them
                  // means those references are filtered out of the file
                  filter: (token) => token.attributes.type === `background`,
                },
              ],
            },
          },
        });

        await sd.buildAllPlatforms();

        const output = logs.output;
        expect(output).to.include('defaultFilteredReferences.css');
        expect(output).to.match(/reference/i);
        expect(output).to.match(/\d/);
        expect(output).to.match(/verbose/i);
        // none of the 7 filtered out references
        expect(output).to.not.include('color.core.neutral.100');
        expect(output).to.not.include('color.core.neutral.0');
        expect(output).to.not.include('color.core.red.0');
        expect(output).to.not.include('color.core.blue.0');
        expect(nonEmptyLines(output).length).to.be.at.most(10);
      });

      it(`should summarise reference errors instead of listing every occurrence`, async () => {
        const sd = new StyleDictionary({
          source: [brokenRefsFile],
          platforms: {
            css: {},
          },
        });

        // at default verbosity reference errors are reported, not thrown
        await sd.buildAllPlatforms();

        const output = logs.output;
        // the category is named
        expect(output).to.match(/reference/i);
        // how many occurrences there are
        expect(output).to.match(/\b3\b/);
        // and how to see the details
        expect(output).to.match(/verbose/i);
        // but the individual occurrences are withheld
        expect(output).to.not.include('color.base.green');
        expect(output).to.not.include('color.base.blue');
        expect(output).to.not.include('size.missing');
        expect(nonEmptyLines(output).length).to.be.at.most(8);
      });
    });
  });
});
