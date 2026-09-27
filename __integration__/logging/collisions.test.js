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
 * Token collisions happen in two places: value collisions while merging the
 * source files during extend, and output-name collisions while building a
 * file. By default both must be reported as a concise, bounded summary
 * instead of listing every occurrence, while log level 'error' must turn
 * both into thrown errors instead of warnings. Listing every collision is
 * what --verbose is for; that side is covered in
 * __node_tests__/cliVerbose.test.js.
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
    clearOutput(buildPath);
  });

  function countOccurrences(haystack, needle) {
    return haystack.split(needle).length - 1;
  }

  function sharedPathTokens(prefix) {
    const size = {};
    for (let i = 0; i < 10; i++) {
      size[`pad${i}`] = { value: `${prefix}-${i}`, type: 'dimension' };
    }
    return { size };
  }

  // Two existing source files, re-parsed so both define the exact same ten
  // token paths with different values: many value collisions while merging.
  const sharedPathParser = {
    pattern: /padding\.json$/,
    parse: ({ filePath }) => sharedPathTokens(filePath.includes('_padding') ? 'b' : 'a'),
  };

  const collisionSources = [
    '__integration__/tokens/size/padding.json',
    '__integration__/tokens/size/_padding.json',
  ];

  // Pairs of tokens that share a leaf key, so their output names collide
  // once no name transform disambiguates them.
  function nameCollisionTokens(pairCount) {
    const tokens = {};
    for (let i = 0; i < pairCount; i++) {
      tokens[`alpha${i}`] = { [`dup${i}`]: { value: `a-${i}` } };
      tokens[`beta${i}`] = { [`dup${i}`]: { value: `b-${i}` } };
    }
    return tokens;
  }

  function nameCollisionConfig(extra = {}) {
    return {
      ...extra,
      tokens: nameCollisionTokens(14),
      platforms: {
        web: {
          buildPath,
          files: [{ destination: 'nameCollisionSummary.css', format: 'css/variables' }],
        },
      },
    };
  }

  describe('logging > token collisions', () => {
    it('value collisions while merging source files are reported by default as a concise bounded summary', async () => {
      const sd = new StyleDictionary({
        source: collisionSources,
        parsers: [sharedPathParser],
        platforms: {},
      });
      await sd.hasInitialized;
      const output = collectOutput();

      // there is a summary and it is recognizable as collision trouble...
      expect(output).to.match(/collision/i);
      // ...but with 40 individual collisions it stays bounded and does not
      // enumerate every one of them
      expect(output.length).to.be.below(1600);
      expect(countOccurrences(output, 'Collision detected')).to.be.below(20);
      let mentioned = 0;
      for (let i = 0; i < 10; i++) {
        if (output.includes(`size.pad${i}`)) mentioned++;
      }
      expect(mentioned).to.be.below(10);
    });

    it('value collisions throw instead of being logged as a warning when log level is error', async () => {
      const sd = new StyleDictionary(
        {
          log: 'error',
          source: collisionSources,
          parsers: [sharedPathParser],
          platforms: {},
        },
        { init: false },
      );

      let error;
      try {
        await sd.init();
      } catch (err) {
        error = err;
      }

      expect(error).to.be.an('error');
      expect(error.message).to.match(/collision/i);
      // and nothing was logged as a warning instead
      expect(collectOutput()).to.not.match(/collision/i);
    });

    it('output-name collisions while building a file are reported by default as a concise bounded summary', async () => {
      const sd = new StyleDictionary(nameCollisionConfig());
      await sd.buildAllPlatforms();
      const output = collectOutput();

      // the user still learns which file had the problem...
      expect(output).to.match(/collision/i);
      expect(output).to.include('nameCollisionSummary.css');
      // ...but with 14 colliding output names the report stays bounded
      expect(output.length).to.be.below(1100);
      expect(countOccurrences(output, 'was generated by')).to.be.below(7);
      let mentioned = 0;
      for (let i = 0; i < 14; i++) {
        if (output.includes(`alpha${i}.dup${i}`)) mentioned++;
      }
      expect(mentioned).to.be.below(7);
    });

    it('output-name collisions throw instead of being logged as a warning when log level is error', async () => {
      const sd = new StyleDictionary(nameCollisionConfig({ log: 'error' }));

      let error;
      try {
        await sd.buildAllPlatforms();
      } catch (err) {
        error = err;
      }

      expect(error).to.be.an('error');
      expect(error.message).to.match(/collision/i);
      // and nothing was logged as a warning instead
      expect(collectOutput()).to.not.match(/collision/i);
    });
  });
});
