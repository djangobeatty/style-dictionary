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
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from './_constants.js';
import { clearOutput } from '../__tests__/__helpers.js';

const readOutput = (destination) =>
  fs.readFileSync(resolve(`${buildPath}${destination}`), { encoding: 'UTF-8' });

// declaration names of lines that start with the given variable prefix, in file order
const declaredNames = (output, prefix) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length).split(/[:=]/)[0].trim());

describe('integration', () => {
  before(async () => {
    const sd = new StyleDictionary({
      tokens: {
        colors: {
          red: { $value: '#ff0000' },
          primary: { $value: '{colors.red}' },
        },
      },
      platforms: {
        web: {
          transforms: ['name/kebab'],
          buildPath,
          options: {
            outputReferences: true,
          },
          files: [
            {
              destination: 'dtcg-refs.css',
              format: 'css/variables',
            },
            {
              destination: 'dtcg-refs.less',
              format: 'less/variables',
            },
            {
              destination: 'dtcg-refs.styl',
              format: 'stylus/variables',
            },
            {
              destination: 'dtcg-refs-map.scss',
              format: 'scss/map-deep',
            },
          ],
        },
        compose: {
          transforms: ['name/camel'],
          buildPath,
          options: {
            outputReferences: true,
          },
          files: [
            {
              destination: 'DtcgRefs.kt',
              format: 'compose/object',
              options: {
                className: 'DtcgRefs',
                packageName: 'com.example.tokens',
              },
            },
          ],
        },
        swift: {
          transforms: ['name/camel'],
          buildPath,
          options: {
            outputReferences: true,
          },
          files: [
            {
              destination: 'DtcgRefsClass.swift',
              format: 'ios-swift/class.swift',
            },
            {
              destination: 'DtcgRefsEnum.swift',
              format: 'ios-swift/enum.swift',
            },
            {
              destination: 'DtcgRefsAny.swift',
              format: 'ios-swift/any.swift',
            },
          ],
        },
      },
    });
    await sd.buildAllPlatforms();
  });

  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('DTCG tokens with outputReferences across formats', async () => {
    it('css/variables should declare referenced custom properties first', async () => {
      const output = readOutput('dtcg-refs.css');
      expect(declaredNames(output, '--')).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('--colors-red: #ff0000;');
      expect(output).to.include('--colors-primary: var(--colors-red);');
    });

    it('less/variables should declare referenced variables first', async () => {
      const output = readOutput('dtcg-refs.less');
      expect(declaredNames(output, '@')).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('@colors-red: #ff0000;');
      expect(output).to.include('@colors-primary: @colors-red;');
    });

    it('stylus/variables should declare referenced variables first', async () => {
      const output = readOutput('dtcg-refs.styl');
      expect(declaredNames(output, '$')).to.deep.equal(['colors-red', 'colors-primary']);
      expect(output).to.include('$colors-red= #ff0000;');
      expect(output).to.include('$colors-primary= $colors-red;');
    });

    it('scss/map-deep should declare referenced variables first', async () => {
      const output = readOutput('dtcg-refs-map.scss');
      const order = [...output.matchAll(/^\$(colors-[^:]+):/gm)].map((match) => match[1]);
      expect(order).to.deep.equal(['colors-red', 'colors-primary']);
      // scss/map-deep defaults themeable to true, so declarations carry !default
      expect(output).to.include('$colors-red: #ff0000 !default;');
      expect(output).to.include('$colors-primary: $colors-red !default;');
    });

    it('compose/object should declare referenced values first', async () => {
      const output = readOutput('DtcgRefs.kt');
      expect(declaredNames(output, 'val ')).to.deep.equal(['colorsRed', 'colorsPrimary']);
      expect(output).to.include('val colorsRed = #ff0000');
      expect(output).to.include('val colorsPrimary = colorsRed');
    });

    it('ios-swift formats should declare referenced values first', async () => {
      const destinations = ['DtcgRefsClass.swift', 'DtcgRefsEnum.swift', 'DtcgRefsAny.swift'];
      for (const destination of destinations) {
        const output = readOutput(destination);
        const names = output
          .split('\n')
          .filter((line) => line.includes('static let '))
          .map((line) => line.split('static let ')[1].split(' ')[0]);
        expect(names, destination).to.deep.equal(['colorsRed', 'colorsPrimary']);
        expect(output, destination).to.include('static let colorsRed = #ff0000');
        expect(output, destination).to.include('static let colorsPrimary = colorsRed');
      }
    });
  });
});
