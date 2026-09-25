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

/**
 * brand -> primary -> red, declared in an order that is neither the correct
 * dependency order nor its reverse.
 */
const dtcgTokens = {
  colors: {
    primary: { $value: '{colors.red}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
    brand: { $value: '{colors.primary}', $type: 'color' },
  },
};

const v3Tokens = {
  colors: {
    primary: { value: '{colors.red}', type: 'color' },
    red: { value: '#ff0000', type: 'color' },
    brand: { value: '{colors.primary}', type: 'color' },
  },
};

const makePlatforms = () => ({
  web: {
    transforms: ['name/kebab'],
    options: {
      outputReferences: true,
      showFileHeader: false,
    },
    files: [
      { destination: 'variables.css', format: 'css/variables' },
      { destination: 'variables.scss', format: 'scss/variables' },
      { destination: 'map-deep.scss', format: 'scss/map-deep', options: { mapName: 'tokens' } },
      { destination: 'variables.less', format: 'less/variables' },
      { destination: 'variables.styl', format: 'stylus/variables' },
    ],
  },
  code: {
    transforms: ['name/camel'],
    options: {
      outputReferences: true,
      showFileHeader: false,
      className: 'StyleDictionary',
      packageName: 'com.example.tokens',
    },
    files: [
      { destination: 'StyleDictionary.kt', format: 'compose/object' },
      { destination: 'ClassStyleDictionary.swift', format: 'ios-swift/class.swift' },
      { destination: 'EnumStyleDictionary.swift', format: 'ios-swift/enum.swift' },
      { destination: 'AnyStyleDictionary.swift', format: 'ios-swift/any.swift' },
      { destination: 'style_dictionary.dart', format: 'flutter/class.dart' },
    ],
  },
});

const formatTokens = async (tokens) => {
  const sd = new StyleDictionary({ tokens, platforms: makePlatforms() });
  const platformOutputs = await sd.formatAllPlatforms();
  const byDestination = {};
  Object.values(platformOutputs).forEach((files) => {
    files.forEach(({ destination, output }) => {
      byDestination[destination] = output;
    });
  });
  return byDestination;
};

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

// [destination, declaration markers in required dependency order]
const orderSensitiveFormats = [
  ['variables.css', ['--colors-red:', '--colors-primary:', '--colors-brand:']],
  ['variables.scss', ['$colors-red:', '$colors-primary:', '$colors-brand:']],
  ['map-deep.scss', ['$colors-red:', '$colors-primary:', '$colors-brand:']],
  ['variables.less', ['@colors-red:', '@colors-primary:', '@colors-brand:']],
  ['variables.styl', ['$colors-red=', '$colors-primary=', '$colors-brand=']],
  ['StyleDictionary.kt', ['val colorsRed =', 'val colorsPrimary =', 'val colorsBrand =']],
  [
    'ClassStyleDictionary.swift',
    ['static let colorsRed =', 'static let colorsPrimary =', 'static let colorsBrand ='],
  ],
  [
    'EnumStyleDictionary.swift',
    ['static let colorsRed =', 'static let colorsPrimary =', 'static let colorsBrand ='],
  ],
  [
    'AnyStyleDictionary.swift',
    ['static let colorsRed =', 'static let colorsPrimary =', 'static let colorsBrand ='],
  ],
  [
    'style_dictionary.dart',
    ['static const colorsRed =', 'static const colorsPrimary =', 'static const colorsBrand ='],
  ],
];

describe('integration', () => {
  beforeEach(() => {
    stubMethod(console, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('DTCG reference ordering across built-in formats', () => {
    it('should declare referenced DTCG tokens first in every order-sensitive format', async () => {
      const outputs = await formatTokens(dtcgTokens);

      orderSensitiveFormats.forEach(([destination, markers]) => {
        expect(outputs[destination], `no output was generated for ${destination}`).to.be.a(
          'string',
        );
        expectDeclarationOrder(destination, outputs[destination], markers);
      });
    });

    it('should keep DTCG reference values pointing at the variables they define', async () => {
      const outputs = await formatTokens(dtcgTokens);

      expect(outputs['variables.css']).to.include('--colors-primary: var(--colors-red);');
      expect(outputs['variables.css']).to.include('--colors-brand: var(--colors-primary);');
      expect(outputs['variables.scss']).to.include('$colors-primary: $colors-red;');
      expect(outputs['variables.less']).to.include('@colors-primary: @colors-red;');
      expect(outputs['variables.styl']).to.include('$colors-primary= $colors-red;');
      expect(outputs['StyleDictionary.kt']).to.include('val colorsPrimary = colorsRed');
      expect(outputs['style_dictionary.dart']).to.include(
        'static const colorsPrimary = colorsRed;',
      );
    });

    it('should produce identical output for DTCG tokens and the equivalent v3 tokens', async () => {
      const dtcg = await formatTokens(dtcgTokens);
      const v3 = await formatTokens(v3Tokens);

      orderSensitiveFormats.forEach(([destination]) => {
        expect(dtcg[destination], `DTCG output differs from v3 output for ${destination}`).to.equal(
          v3[destination],
        );
      });
    });
  });
});
