import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { clearOutput } from '../__tests__/__helpers.js';
import { formats } from '../lib/enums/index.js';

const { typescriptEs6Declarations } = formats;

const buildPath = '__integration__/build/ts-es6-comment-style-none/';

// Legacy token syntax: description travels on `comment`
const legacyTokens = {
  color: {
    background: {
      disabled: {
        value: '#f4f5f2',
        type: 'color',
        comment: 'Background when disabled',
      },
      readOnly: {
        value: '#fafbf9',
        type: 'color',
        comment: 'Background when read only\nCovers read-only surfaces',
      },
      base: {
        value: '#ffffff',
        type: 'color',
      },
    },
  },
};

// DTCG token syntax: description travels on `$description`
const dtcgTokens = {
  color: {
    background: {
      disabled: {
        $value: '#f4f5f2',
        $type: 'color',
        $description: 'Background when disabled',
      },
      readOnly: {
        $value: '#fafbf9',
        $type: 'color',
        $description: 'Background when read only\nCovers read-only surfaces',
      },
      base: {
        $value: '#ffffff',
        $type: 'color',
      },
    },
  },
};

function makeConfig(tokens, destination) {
  return {
    tokens,
    platforms: {
      js: {
        buildPath,
        files: [
          {
            destination,
            format: typescriptEs6Declarations,
            options: {
              showFileHeader: false,
              formatting: { commentStyle: 'none' },
            },
          },
        ],
      },
    },
  };
}

function nonEmptyLines(output) {
  return output.split('\n').filter((line) => line.trim() !== '');
}

function expectOnlyDeclarations(output) {
  const lines = nonEmptyLines(output);
  expect(lines).to.have.lengthOf(3);
  for (const line of lines) {
    expect(line).to.match(/^export const \w+: string;$/);
  }
  expect(output).to.not.include('undefined');
  expect(output).to.not.include('Background when disabled');
  expect(output).to.not.include('Covers read-only surfaces');
}

describe('integration', () => {
  let legacyOutput = '';
  let dtcgOutput = '';

  before(async () => {
    clearOutput(buildPath);

    const legacySd = new StyleDictionary(makeConfig(legacyTokens, 'es6-declarations-none.d.ts'));
    await legacySd.buildAllPlatforms();

    const dtcgSd = new StyleDictionary(makeConfig(dtcgTokens, 'es6-declarations-none-dtcg.d.ts'));
    await dtcgSd.buildAllPlatforms();

    legacyOutput = fs.readFileSync(resolve(`${buildPath}es6-declarations-none.d.ts`), {
      encoding: 'UTF-8',
    });
    dtcgOutput = fs.readFileSync(resolve(`${buildPath}es6-declarations-none-dtcg.d.ts`), {
      encoding: 'UTF-8',
    });
  });

  after(() => {
    clearOutput(buildPath);
  });

  describe('typescript/es6-declarations with formatting.commentStyle "none"', () => {
    it('legacy tokens (comment) emit only their declarations, with no undefined', () => {
      expectOnlyDeclarations(legacyOutput);
      expect(legacyOutput).to.match(/^export const disabled: string;$/m);
      expect(legacyOutput).to.match(/^export const readOnly: string;$/m);
      expect(legacyOutput).to.match(/^export const base: string;$/m);
    });

    it('DTCG tokens ($description) emit only their declarations, with no undefined', () => {
      expectOnlyDeclarations(dtcgOutput);
      expect(dtcgOutput).to.match(/^export const disabled: string;$/m);
      expect(dtcgOutput).to.match(/^export const readOnly: string;$/m);
      expect(dtcgOutput).to.match(/^export const base: string;$/m);
    });
  });
});
