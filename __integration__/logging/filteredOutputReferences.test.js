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
 * When a file combines a filter with outputReferences, references that were
 * filtered out of the file are collected and warned about while the file is
 * built. By default that warning must be a concise, bounded summary instead
 * of a list of every filtered-out reference; listing every occurrence is
 * what --verbose is for, covered in __node_tests__/cliVerbose.test.js.
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

  // 25 background tokens that each reference a base token; the filter keeps
  // only the background tokens, so all 25 base references get filtered out.
  function filteredReferenceTokens() {
    const surfaces = {};
    for (let i = 0; i < 25; i++) {
      const id = String(i).padStart(2, '0');
      surfaces[`base${id}`] = { value: '#aaaaaa' };
      surfaces[`bg${id}`] = { value: `{color.palette.surfaces.base${id}.value}` };
    }
    return { color: { palette: { surfaces } } };
  }

  describe('logging > filtered output references', () => {
    it('is reported by default as a concise bounded summary', async () => {
      const sd = new StyleDictionary({
        tokens: filteredReferenceTokens(),
        platforms: {
          css: {
            transformGroup: 'css',
            buildPath,
            files: [
              {
                destination: 'filteredReferenceSummary.css',
                format: 'css/variables',
                filter: (token) => token.path[token.path.length - 1].startsWith('bg'),
                options: {
                  outputReferences: true,
                },
              },
            ],
          },
        },
      });
      await sd.buildAllPlatforms();
      const output = collectOutput();

      // the user still learns which file had filtered-out references...
      expect(output).to.include('filteredReferenceSummary.css');
      expect(output).to.match(/reference/i);
      // ...but with 25 filtered-out references the warning stays bounded and
      // does not list every one of them
      expect(output.length).to.be.below(800);
      let mentioned = 0;
      for (let i = 0; i < 25; i++) {
        const id = String(i).padStart(2, '0');
        if (output.includes(`color.palette.surfaces.base${id}`)) mentioned++;
      }
      expect(mentioned).to.be.below(13);
    });
  });
});
