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

const configDocPath = 'docs/src/content/docs/reference/config.md';

// Matches an extension as its own token, with or without a leading dot, so that
// ".json" is not satisfied by ".json5"/".jsonc" and ".js" is not satisfied by ".json".
const extPattern = (ext) => new RegExp(`(?:\\.${ext}|(?<![\\w.])${ext})(?![\\w])`, 'i');

const extensions = ['json', 'json5', 'jsonc', 'js', 'mjs', 'ts'];
// extensions the config reference does not mention at all today
const newExtensions = ['json5', 'jsonc', 'mjs', 'ts'];

describe('configuration documentation', () => {
  let doc;

  before(() => {
    doc = fs.readFileSync(configDocPath, 'utf-8');
  });

  it('should document the token file extensions that are not covered today', () => {
    newExtensions.forEach((ext) => {
      expect(
        extPattern(ext).test(doc),
        `${configDocPath} should document the "${ext}" token file extension`,
      ).to.be.true;
    });
  });

  it('should list every accepted token file extension in one place', () => {
    const windowSize = 2000;
    const patterns = extensions.map(extPattern);
    let sectionFound = false;
    for (let i = 0; i < doc.length; i += 200) {
      const chunk = doc.slice(i, i + windowSize);
      if (patterns.every((pattern) => pattern.test(chunk))) {
        sectionFound = true;
        break;
      }
    }
    expect(
      sectionFound,
      `${configDocPath} should list ${extensions.join(', ')} together as the token file extensions accepted by source/include`,
    ).to.be.true;
  });

  it('should say which config keys those extensions apply to', () => {
    const tsMatches = [...doc.matchAll(/typescript/gi)];
    expect(tsMatches.length, `${configDocPath} should mention TypeScript`).to.be.greaterThan(0);

    const mentionsSourceOrInclude = tsMatches.some((match) => {
      const near = doc.slice(Math.max(0, match.index - 1500), match.index + 1500);
      return /source/i.test(near) && /include/i.test(near);
    });
    expect(
      mentionsSourceOrInclude,
      `${configDocPath} should tie the TypeScript token file support to the source/include keys`,
    ).to.be.true;
  });

  it('should state the runtime requirement for typescript token files', () => {
    const tsMatches = [...doc.matchAll(/typescript/gi)];
    expect(tsMatches.length, `${configDocPath} should mention TypeScript`).to.be.greaterThan(0);

    const runtimeRequirement = /strip-types|nativel|Deno|Bun|runtime/i;
    const statesRequirement = tsMatches.some((match) => {
      const near = doc.slice(Math.max(0, match.index - 1500), match.index + 1500);
      return runtimeRequirement.test(near);
    });
    expect(
      statesRequirement,
      `${configDocPath} should state that TypeScript token files require a runtime that can execute TypeScript`,
    ).to.be.true;
  });
});
