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
import sortByReference from '../../../lib/common/formatHelpers/sortByReference.js';
import flattenTokens from '../../../lib/utils/flattenTokens.js';

/**
 * Creates a token in either the default or the DTCG syntax.
 * @param {string[]} path
 * @param {string} originalValue - the value before references were resolved
 * @param {string} value - the resolved value
 * @param {boolean} usesDtcg
 */
function token(path, originalValue, value, usesDtcg) {
  const valueProp = usesDtcg ? '$value' : 'value';
  const typeProp = usesDtcg ? '$type' : 'type';
  return {
    [valueProp]: value,
    [typeProp]: 'color',
    original: {
      [valueProp]: originalValue,
      [typeProp]: 'color',
    },
    name: path.join('-'),
    path,
  };
}

describe('common', () => {
  describe('formatHelpers', () => {
    describe('sortByReference', () => {
      [false, true].forEach((usesDtcg) => {
        describe(`${usesDtcg ? 'DTCG' : 'default'} syntax`, () => {
          it('should sort a token that references another token after its reference', () => {
            const tokens = {
              colors: {
                primary: token(['colors', 'primary'], '{colors.red}', '#ff0000', usesDtcg),
                red: token(['colors', 'red'], '#ff0000', '#ff0000', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);

            expect(
              [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name),
            ).to.eql(['colors-red', 'colors-primary']);
          });

          it('should keep already correctly ordered tokens in place', () => {
            const tokens = {
              colors: {
                red: token(['colors', 'red'], '#ff0000', '#ff0000', usesDtcg),
                primary: token(['colors', 'primary'], '{colors.red}', '#ff0000', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);

            expect(
              [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name),
            ).to.eql(['colors-red', 'colors-primary']);
          });

          it('should sort transitive reference chains in definition order', () => {
            const tokens = {
              colors: {
                c: token(['colors', 'c'], '{colors.b}', '#ff0000', usesDtcg),
                b: token(['colors', 'b'], '{colors.a}', '#ff0000', usesDtcg),
                a: token(['colors', 'a'], '#ff0000', '#ff0000', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);

            expect(
              [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name),
            ).to.eql(['colors-a', 'colors-b', 'colors-c']);
          });

          it('should not reverse tokens that do not reference each other', () => {
            const tokens = {
              colors: {
                red: token(['colors', 'red'], '#ff0000', '#ff0000', usesDtcg),
                green: token(['colors', 'green'], '#00ff00', '#00ff00', usesDtcg),
                blue: token(['colors', 'blue'], '#0000ff', '#0000ff', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);

            expect(
              [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name),
            ).to.eql(['colors-red', 'colors-green', 'colors-blue']);
          });

          it('should sort references after their definitions when mixed with plain tokens', () => {
            const tokens = {
              colors: {
                red: token(['colors', 'red'], '#ff0000', '#ff0000', usesDtcg),
                secondary: token(['colors', 'secondary'], '{colors.primary}', '#ff0000', usesDtcg),
                primary: token(['colors', 'primary'], '{colors.red}', '#ff0000', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);
            const sorted = [...allTokens]
              .sort(sortByReference(tokens, { usesDtcg }))
              .map((t) => t.name);

            expect(sorted.indexOf('colors-red')).to.be.lessThan(sorted.indexOf('colors-primary'));
            expect(sorted.indexOf('colors-primary')).to.be.lessThan(
              sorted.indexOf('colors-secondary'),
            );
          });

          it('should resolve references that explicitly point at the value property', () => {
            const valueProp = `${usesDtcg ? '$' : ''}value`;
            const tokens = {
              colors: {
                secondary: token(
                  ['colors', 'secondary'],
                  `{colors.primary.${valueProp}}`,
                  '#ff0000',
                  usesDtcg,
                ),
                primary: token(
                  ['colors', 'primary'],
                  `{colors.red.${valueProp}}`,
                  '#ff0000',
                  usesDtcg,
                ),
                red: token(['colors', 'red'], '#ff0000', '#ff0000', usesDtcg),
              },
            };
            const allTokens = flattenTokens(tokens, usesDtcg);

            expect(
              [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name),
            ).to.eql(['colors-red', 'colors-primary', 'colors-secondary']);
          });
        });
      });
    });
  });
});
