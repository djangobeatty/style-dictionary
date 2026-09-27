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
 * In "error" mode each of the three noisy warning categories aborts the build
 * with a thrown error instead of logging, and the thrown message honours the
 * same concise-by-default / full-detail-under-verbose distinction as the
 * logged messages do.
 */

const fixturePath = `${buildPath}logging-error-fixtures/`;
const brokenRefsFile = `${fixturePath}broken-refs.json`;

// exactly three broken references
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

const buildAndCatch = async (sd) => {
  let error;
  try {
    await sd.buildAllPlatforms();
  } catch (e) {
    error = e;
  }
  expect(error).to.be.an('Error');
  return cleanConsoleOutput(error.message);
};

const referenceErrorDictionary = (log) =>
  new StyleDictionary({
    log,
    source: [brokenRefsFile],
    platforms: {
      css: {},
    },
  });

const nameCollisionDictionary = (log) =>
  new StyleDictionary({
    log,
    source: [`__integration__/tokens/**/[!_]*.json?(c)`],
    platforms: {
      css: {
        // no name transform means there will be name collisions
        transforms: [`attribute/cti`],
        buildPath,
        files: [
          {
            destination: `errorNameCollisions.css`,
            format: `css/variables`,
            filter: (token) => token.type === `color`,
          },
        ],
      },
    },
  });

const filteredReferenceDictionary = (log) =>
  new StyleDictionary({
    log,
    source: [`__integration__/tokens/**/[!_]*.json?(c)`],
    platforms: {
      css: {
        transformGroup: `css`,
        buildPath,
        files: [
          {
            destination: `errorFilteredReferences.css`,
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

const filteredReferences = [
  'color.core.neutral.100',
  'color.core.neutral.0',
  'color.core.neutral.200',
  'color.core.red.0',
  'color.core.orange.0',
  'color.core.green.0',
  'color.core.blue.0',
];

describe(`integration >`, () => {
  describe(`logging >`, () => {
    describe(`warnings as errors >`, () => {
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

      it(`should throw a concise name collision message instead of logging it`, async () => {
        const message = await buildAndCatch(
          nameCollisionDictionary({ warnings: 'error', verbosity: 'default' }),
        );

        expect(message).to.match(/collision/i);
        expect(message).to.match(/\d/);
        expect(message).to.match(/verbose/i);
        expect(message).to.not.include('color.core.green.0');
        expect(message).to.not.include('#ebf9eb');
        expect(message).to.not.include('color.font.interactive.disabled');
        // it was thrown, not logged
        expect(logs.output).to.not.match(/collision/i);
      });

      it(`should throw a fully detailed name collision message when verbose`, async () => {
        const message = await buildAndCatch(
          nameCollisionDictionary({ warnings: 'error', verbosity: 'verbose' }),
        );

        expect(message).to.include('color.core.green.0');
        expect(message).to.include('#ebf9eb');
        expect(message).to.include('color.core.yellow.1100');
        expect(message).to.include('color.font.interactive.disabled');
        expect(logs.output).to.not.match(/collision/i);
      });

      it(`should throw a concise filtered references message instead of logging it`, async () => {
        const message = await buildAndCatch(
          filteredReferenceDictionary({ warnings: 'error', verbosity: 'default' }),
        );

        expect(message).to.match(/reference/i);
        expect(message).to.match(/\d/);
        expect(message).to.match(/verbose/i);
        filteredReferences.forEach((reference) => {
          expect(message).to.not.include(reference);
        });
        // it was thrown, not logged
        expect(logs.output).to.not.match(/reference/i);
      });

      it(`should throw a fully detailed filtered references message when verbose`, async () => {
        const message = await buildAndCatch(
          filteredReferenceDictionary({ warnings: 'error', verbosity: 'verbose' }),
        );

        filteredReferences.forEach((reference) => {
          expect(message).to.include(reference);
        });
        expect(logs.output).to.not.match(/reference/i);
      });

      it(`should throw a concise reference error message instead of logging it`, async () => {
        const message = await buildAndCatch(
          referenceErrorDictionary({ warnings: 'error', verbosity: 'default' }),
        );

        expect(message).to.match(/reference/i);
        expect(message).to.match(/\b3\b/);
        expect(message).to.match(/verbose/i);
        expect(message).to.not.include('color.base.green');
        expect(message).to.not.include('color.base.blue');
        expect(message).to.not.include('size.missing');
        // it was thrown, not logged
        expect(logs.output).to.not.match(/reference/i);
      });

      it(`should throw a fully detailed reference error message when verbose`, async () => {
        const message = await buildAndCatch(
          referenceErrorDictionary({ warnings: 'error', verbosity: 'verbose' }),
        );

        expect(message).to.include('color.base.green');
        expect(message).to.include('color.base.blue');
        expect(message).to.include('size.missing');
        expect(logs.output).to.not.match(/reference/i);
      });
    });
  });
});
