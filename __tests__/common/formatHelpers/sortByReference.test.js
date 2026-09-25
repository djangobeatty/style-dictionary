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
 * Build a nested token tree with the shape Style Dictionary has after transforming,
 * so that references can be resolved by `getReferences`.
 * @param {object} rawTokens
 * @param {boolean} usesDtcg
 * @returns {object}
 */
function makeTokens(rawTokens, usesDtcg) {
  const valueProp = usesDtcg ? '$value' : 'value';

  function walk(node, path) {
    const out = {};
    for (const key in node) {
      if (Object.hasOwn(node, key)) {
        const child = node[key];
        const childPath = [...path, key];
        if (child && typeof child === 'object' && Object.hasOwn(child, valueProp)) {
          out[key] = {
            name: childPath.join('-'),
            path: childPath,
            [valueProp]: child[valueProp],
            original: { [valueProp]: child[valueProp] },
          };
        } else if (child && typeof child === 'object') {
          out[key] = walk(child, childPath);
        }
      }
    }
    return out;
  }

  return walk(rawTokens, []);
}

function sortedNames(tokens, usesDtcg) {
  const allTokens = flattenTokens(tokens, usesDtcg);
  return [...allTokens].sort(sortByReference(tokens, { usesDtcg })).map((t) => t.name);
}

function tokensByName(tokens, usesDtcg) {
  return Object.fromEntries(flattenTokens(tokens, usesDtcg).map((t) => [t.name, t]));
}

describe('common', () => {
  describe('formatHelpers', () => {
    describe('sortByReference', () => {
      it('should sort a referencing token after the token it references', () => {
        const raw = {
          colors: {
            red: { value: '#ff0000' },
            primary: { value: '{colors.red}' },
          },
        };
        const tokens = makeTokens(raw, false);
        expect(sortedNames(tokens, false)).to.eql(['colors-red', 'colors-primary']);
      });

      it('should sort DTCG ($value) referencing tokens after the token they reference', () => {
        const raw = {
          colors: {
            red: { $value: '#ff0000' },
            primary: { $value: '{colors.red}' },
          },
        };
        const tokens = makeTokens(raw, true);
        expect(sortedNames(tokens, true)).to.eql(['colors-red', 'colors-primary']);
      });

      it('should work when called without options', () => {
        const raw = {
          colors: {
            red: { value: '#ff0000' },
            primary: { value: '{colors.red}' },
          },
        };
        const tokens = makeTokens(raw, false);
        const sorted = [...flattenTokens(tokens)].sort(sortByReference(tokens));
        expect(sorted.map((t) => t.name)).to.eql(['colors-red', 'colors-primary']);
      });

      it('should sort DTCG reference chains in definition order', () => {
        const raw = {
          a: { $value: '{b}' },
          b: { $value: '{c}' },
          c: { $value: '#000000' },
        };
        const tokens = makeTokens(raw, true);
        expect(sortedNames(tokens, true)).to.eql(['c', 'b', 'a']);
      });

      it('should place a referencing token after the token it references, even with multiple references', () => {
        // a references both c and b (in that order), and b references d
        const raw = {
          a: { value: '{c} {b}' },
          b: { value: '{d}' },
          c: { value: 'c' },
          d: { value: 'd' },
        };
        const tokens = makeTokens(raw, false);
        const byName = tokensByName(tokens, false);
        const sorter = sortByReference(tokens, {});
        // b comes first, because a references b
        expect(sorter(byName.a, byName.b)).to.be.greaterThan(0);
        expect(sorter(byName.b, byName.a)).to.be.lessThan(0);
      });

      it('should place a DTCG referencing token after the token it references, even with multiple references', () => {
        // a references both c and b (in that order), and b references d
        const raw = {
          a: { $value: '{c} {b}' },
          b: { $value: '{d}' },
          c: { $value: 'c' },
          d: { $value: 'd' },
        };
        const tokens = makeTokens(raw, true);
        const byName = tokensByName(tokens, true);
        const sorter = sortByReference(tokens, { usesDtcg: true });
        // b comes first, because a references b
        expect(sorter(byName.a, byName.b)).to.be.greaterThan(0);
        expect(sorter(byName.b, byName.a)).to.be.lessThan(0);
      });
    });
  });
});
