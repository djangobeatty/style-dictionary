import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { clearOutput } from '../__tests__/__helpers.js';
import { formats } from '../lib/enums/index.js';

const { javascriptEs6 } = formats;

const buildPath = '__integration__/build/es6-comment-style-none/';

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
            format: javascriptEs6,
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

function expectOnlyExportConsts(output) {
  const lines = nonEmptyLines(output);
  expect(lines).to.have.lengthOf(3);
  for (const line of lines) {
    expect(line).to.match(/^export const \w+ = ["'][^"']+["'];$/);
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

    const legacySd = new StyleDictionary(makeConfig(legacyTokens, 'es6-none.js'));
    await legacySd.buildAllPlatforms();

    const dtcgSd = new StyleDictionary(makeConfig(dtcgTokens, 'es6-none-dtcg.js'));
    await dtcgSd.buildAllPlatforms();

    legacyOutput = fs.readFileSync(resolve(`${buildPath}es6-none.js`), { encoding: 'UTF-8' });
    dtcgOutput = fs.readFileSync(resolve(`${buildPath}es6-none-dtcg.js`), { encoding: 'UTF-8' });
  });

  after(() => {
    clearOutput(buildPath);
  });

  describe('javascript/es6 with formatting.commentStyle "none"', () => {
    it('legacy tokens (comment) emit only their export const statements, with no undefined', () => {
      expectOnlyExportConsts(legacyOutput);
      expect(legacyOutput).to.match(/export const disabled = ["']#f4f5f2["'];/);
      expect(legacyOutput).to.match(/export const readOnly = ["']#fafbf9["'];/);
      expect(legacyOutput).to.match(/export const base = ["']#ffffff["'];/);
    });

    it('DTCG tokens ($description) emit only their export const statements, with no undefined', () => {
      expectOnlyExportConsts(dtcgOutput);
      expect(dtcgOutput).to.match(/export const disabled = ["']#f4f5f2["'];/);
      expect(dtcgOutput).to.match(/export const readOnly = ["']#fafbf9["'];/);
      expect(dtcgOutput).to.match(/export const base = ["']#ffffff["'];/);
    });

    it('generated file is valid JavaScript with exactly one export const per token', async () => {
      for (const output of [legacyOutput, dtcgOutput]) {
        // importing the generated module proves it parses cleanly as an ES module:
        // a syntax error or a duplicate export declaration makes this import reject
        const mod = await import(`data:text/javascript,${encodeURIComponent(output)}`);
        expect(Object.keys(mod).sort()).to.eql(['base', 'disabled', 'readOnly']);
        expect(mod.disabled).to.equal('#f4f5f2');
        expect(mod.readOnly).to.equal('#fafbf9');
        expect(mod.base).to.equal('#ffffff');
      }
    }).timeout(20000);
  });
});
