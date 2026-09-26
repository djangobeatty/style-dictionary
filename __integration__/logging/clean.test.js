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
 * Files being created and removed should be shown to the user unless
 * logging is set to silent. We assert the file logs rather than snapshotting
 * the output, since directory removal logs depend on the state of the
 * build directory that other tests write into as well.
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
    describe(`clean`, () => {
      const config = {
        tokens: {
          color: {
            red: { value: '#f00', type: 'color' },
          },
        },
        platforms: {
          css: {
            transformGroup: `css`,
            buildPath,
            files: [
              {
                destination: `variables.css`,
                format: `css/variables`,
              },
            ],
          },
        },
      };

      it(`should show created and removed files`, async () => {
        const sd = new StyleDictionary(config);
        await sd.buildAllPlatforms();
        await sd.cleanAllPlatforms();
        const logs = Array.from(stub.calls)
          .flatMap((call) => call.args)
          .map(cleanConsoleOutput);
        expect(logs).to.include(`✔︎ ${buildPath}variables.css`);
        expect(logs).to.include(`- ${buildPath}variables.css`);
      });

      it(`should not show created and removed files with silent logging`, async () => {
        const sd = new StyleDictionary({ ...config, verbosity: `silent` });
        await sd.buildAllPlatforms();
        await sd.cleanAllPlatforms();
        expect(stub.callCount).to.equal(0);
      });
    });
  });
});
