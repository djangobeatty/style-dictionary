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
import fs from 'node:fs';
import { resolve } from '../lib/resolve.js';

const docsPath = resolve('docs/src/content/docs/reference/config.md');

const runtimeRequirement =
  /deno|\bbun\b|type[-\s]?stripp|strip-types|runtime|native\s+typescript|typescript\s+support|node(?:\.js)?\s*2[2-9]/i;

function getTableRow(content, property) {
  const line = content.split('\n').find((entry) => entry.trim().startsWith(`| \`${property}\``));
  return line ?? '';
}

describe('integration', () => {
  describe('configuration reference for TypeScript token files', () => {
    let content;

    before(() => {
      content = fs.readFileSync(docsPath, 'utf-8');
    });

    it('should document .ts and .mts token files for source', () => {
      const row = getTableRow(content, 'source');
      expect(row).to.not.equal('');
      expect(row).to.include('.ts');
      expect(row).to.include('.mts');
    });

    it('should document .ts and .mts token files for include', () => {
      const row = getTableRow(content, 'include');
      expect(row).to.not.equal('');
      expect(row).to.include('.ts');
      expect(row).to.include('.mts');
    });

    it('should note the runtime requirement alongside the TypeScript token file support', () => {
      const sections = content.split(/\n\s*\n/);
      const tsSections = sections.filter((section) => section.includes('.mts'));
      expect(tsSections.length).to.be.greaterThan(0);
      const requirementNoted = tsSections.some((section) => runtimeRequirement.test(section));
      expect(requirementNoted).to.be.true;
    });
  });
});
