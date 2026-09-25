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
import StyleDictionary from 'style-dictionary';
import { restore, stubMethod } from 'hanbi';
import { cleanConsoleOutput } from './_constants.js';

/**
 * DTCG references written in full-path form, i.e. pointing at `.$value`
 * rather than at the token itself. brand -> primary -> red, declared in an
 * order that is neither the correct dependency order nor its reverse.
 */
const dtcgFullPathTokens = {
  colors: {
    primary: { $value: '{colors.red.$value}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
    brand: { $value: '{colors.primary.$value}', $type: 'color' },
  },
};

const makePlatform = () => ({
  transforms: ['name/kebab'],
  options: {
    outputReferences: true,
    showFileHeader: false,
  },
  files: [
    { destination: 'variables.scss', format: 'scss/variables' },
    { destination: 'variables.css', format: 'css/variables' },
    { destination: 'variables.less', format: 'less/variables' },
  ],
});

const expectDeclarationOrder = (destination, output, markers) => {
  const indices = markers.map((marker) => {
    const index = output.indexOf(marker);
    expect(
      index,
      `expected ${destination} to contain "${marker}", got:\n${output}`,
    ).to.be.greaterThan(-1);
    return index;
  });
  for (let i = 1; i < indices.length; i++) {
    expect(
      indices[i],
      `in ${destination}, "${markers[i]}" must be declared after "${markers[i - 1]}", got:\n${output}`,
    ).to.be.greaterThan(indices[i - 1]);
  }
};

describe('integration', () => {
  let stub;

  beforeEach(() => {
    stub = stubMethod(console, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('DTCG full-path references', () => {
    it('should order full-path DTCG references without reporting undefined references', async () => {
      const sd = new StyleDictionary({
        tokens: dtcgFullPathTokens,
        platforms: { web: makePlatform() },
      });
      const outputs = await sd.formatPlatform('web');
      const byDestination = {};
      outputs.forEach(({ destination, output }) => {
        byDestination[destination] = output;
      });

      expectDeclarationOrder('variables.scss', byDestination['variables.scss'], [
        '$colors-red:',
        '$colors-primary:',
        '$colors-brand:',
      ]);
      expectDeclarationOrder('variables.css', byDestination['variables.css'], [
        '--colors-red:',
        '--colors-primary:',
        '--colors-brand:',
      ]);
      expectDeclarationOrder('variables.less', byDestination['variables.less'], [
        '@colors-red:',
        '@colors-primary:',
        '@colors-brand:',
      ]);

      const consoleOutput = [...stub.calls]
        .map((call) => call.args.map((arg) => cleanConsoleOutput(`${arg}`)).join(' '))
        .join('\n');

      expect(consoleOutput).to.not.match(/is not defined/);
      expect(consoleOutput).to.not.match(/filtered out token references/i);
    });
  });
});
