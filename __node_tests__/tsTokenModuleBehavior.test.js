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
import fs from 'node:fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from '../__integration__/_constants.js';

const sourceDir = '__integration__/__ts_behavior_source__';
const includeDir = '__integration__/__ts_behavior_include__';
const outputFile = `${buildPath}ts-behavior.css`;

const baseTs = `interface Token {
  value: string;
  type: string;
}

const tokens: { color: Record<string, Token> } = {
  color: {
    brand: { value: '#123456', type: 'color' },
    neutral: { value: '#111111', type: 'color' },
  },
};

export default tokens;
`;

const accentMts = `const accent: { color: { accent: { value: string; type: string } } } = {
  color: {
    accent: { value: '#654321', type: 'color' },
  },
};

export default accent;
`;

const surfaceJson = `{
  "surface": {
    "bg": { "value": "{color.brand}", "type": "color" }
  }
}
`;

const legacyTs = `interface LegacyToken {
  value: string;
  type: string;
}

const legacy: { legacy: Record<string, LegacyToken> } = {
  legacy: {
    pad: { value: '4px', type: 'spacing' },
  },
};

export default legacy;
`;

describe('integration', function () {
  describe('TypeScript token module behavior', function () {
    this.timeout(20000);

    before(() => {
      fs.mkdirSync(resolve(sourceDir), { recursive: true });
      fs.mkdirSync(resolve(includeDir), { recursive: true });
      fs.writeFileSync(resolve(`${sourceDir}/base.ts`), baseTs);
      fs.writeFileSync(resolve(`${sourceDir}/accent.mts`), accentMts);
      fs.writeFileSync(resolve(`${sourceDir}/surface.json`), surfaceJson);
      fs.writeFileSync(resolve(`${includeDir}/legacy.ts`), legacyTs);
    });

    it('should merge, annotate and resolve references for tokens from TypeScript modules', async () => {
      const sd = new StyleDictionary(
        {
          include: [`${includeDir}/*.ts`],
          source: [`${sourceDir}/*`],
          platforms: {
            css: {
              transformGroup: 'css',
              buildPath,
              files: [
                {
                  destination: 'ts-behavior.css',
                  format: 'css/variables',
                },
              ],
            },
          },
        },
        { init: false },
      );

      try {
        await sd.init();
      } catch (err) {
        // Surface the load failure directly as a test failure: a failed init
        // never settles hasInitialized, so awaiting buildAllPlatforms instead
        // would hang until the mocha timeout with no useful signal.
        throw new Error(`TypeScript token files could not be loaded: ${err.message}`);
      }

      await sd.buildAllPlatforms();

      // deep merge: .ts, .mts and .json source files all contribute to the color group
      expect(sd.tokens).to.have.nested.property('color.brand.value', '#123456');
      expect(sd.tokens).to.have.nested.property('color.neutral.value', '#111111');
      expect(sd.tokens).to.have.nested.property('color.accent.value', '#654321');

      // filePath and isSource metadata for tokens loaded from a .ts source file
      const brandToken = sd.allTokens.find((token) => token.key === '{color.brand}');
      expect(brandToken, 'token from a .ts source file').to.exist;
      expect(brandToken.filePath).to.equal(`${sourceDir}/base.ts`);
      expect(brandToken.isSource).to.be.true;

      // filePath and isSource metadata for tokens loaded from an .mts source file
      const accentToken = sd.allTokens.find((token) => token.key === '{color.accent}');
      expect(accentToken, 'token from an .mts source file').to.exist;
      expect(accentToken.filePath).to.equal(`${sourceDir}/accent.mts`);
      expect(accentToken.isSource).to.be.true;

      // filePath and isSource metadata for tokens loaded from a .ts include file
      const legacyToken = sd.allTokens.find((token) => token.key === '{legacy.pad}');
      expect(legacyToken, 'token from a .ts include file').to.exist;
      expect(legacyToken.filePath).to.equal(`${includeDir}/legacy.ts`);
      expect(legacyToken.isSource).to.be.false;

      // a token defined in a .json file can reference a token exported by a .ts module
      const output = fs.readFileSync(resolve(outputFile), 'utf-8');
      expect(output).to.include('--surface-bg: #123456');
    });

    after(() => {
      fs.rmSync(resolve(sourceDir), { recursive: true, force: true });
      fs.rmSync(resolve(includeDir), { recursive: true, force: true });
      fs.rmSync(resolve(outputFile), { force: true });
    });
  });
});
