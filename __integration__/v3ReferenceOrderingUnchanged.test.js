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

const v3TicketTokens = {
  colors: {
    red: { value: '#ff0000', type: 'color' },
    primary: { value: '{colors.red}', type: 'color' },
  },
};

const v3ChainTokens = {
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

  describe('v3 output references are unchanged', () => {
    it('should keep emitting the v3 two token example exactly as before', async () => {
      const outputs = await formatTokens(v3TicketTokens);

      expect(outputs['variables.scss']).to.equal(
        '$colors-red: #ff0000;\n$colors-primary: $colors-red;\n',
      );
      expect(outputs['variables.css']).to.equal(
        ':root {\n  --colors-red: #ff0000;\n  --colors-primary: var(--colors-red);\n}\n',
      );
      expect(outputs['variables.less']).to.equal(
        '@colors-red: #ff0000;\n@colors-primary: @colors-red;\n',
      );
      expect(outputs['variables.styl']).to.equal(
        '$colors-red= #ff0000;\n$colors-primary= $colors-red;\n',
      );
    });

    it('should keep ordering v3 multi-level chains in every order-sensitive format', async () => {
      const outputs = await formatTokens(v3ChainTokens);

      orderSensitiveFormats.forEach(([destination, markers]) => {
        expect(outputs[destination], `no output was generated for ${destination}`).to.be.a(
          'string',
        );
        expectDeclarationOrder(destination, outputs[destination], markers);
      });
    });

    it('should keep emitting v3 reference values as variable references', async () => {
      const outputs = await formatTokens(v3ChainTokens);

      expect(outputs['variables.css']).to.include('--colors-primary: var(--colors-red);');
      expect(outputs['variables.css']).to.include('--colors-brand: var(--colors-primary);');
      expect(outputs['variables.scss']).to.include('$colors-primary: $colors-red;');
      expect(outputs['variables.scss']).to.include('$colors-brand: $colors-primary;');
      expect(outputs['variables.less']).to.include('@colors-brand: @colors-primary;');
      expect(outputs['variables.styl']).to.include('$colors-brand= $colors-primary;');
      expect(outputs['StyleDictionary.kt']).to.include('val colorsBrand = colorsPrimary');
      expect(outputs['style_dictionary.dart']).to.include(
        'static const colorsBrand = colorsPrimary;',
      );
    });
  });
});
