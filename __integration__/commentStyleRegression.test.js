import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { clearOutput } from '../__tests__/__helpers.js';
import { formats } from '../lib/enums/index.js';

const { javascriptEs6, typescriptEs6Declarations } = formats;

const buildPath = '__integration__/build/comment-style-regression/';

// One token with a single-line comment and one with a multi-line comment,
// so every comment placement branch of both formats is exercised.
const tokens = {
  color: {
    background: {
      primary: {
        value: '#ffffff',
        type: 'color',
        comment: 'Primary background color',
      },
      muted: {
        value: '#fafbf9',
        type: 'color',
        comment: 'Muted background color\nUsed for read-only surfaces',
      },
    },
  },
};

const config = {
  tokens,
  platforms: {
    js: {
      buildPath,
      files: [
        {
          destination: 'es6-default.js',
          format: javascriptEs6,
          options: { showFileHeader: false },
        },
        {
          destination: 'es6-short.js',
          format: javascriptEs6,
          options: { showFileHeader: false, formatting: { commentStyle: 'short' } },
        },
        {
          destination: 'es6-long.js',
          format: javascriptEs6,
          options: { showFileHeader: false, formatting: { commentStyle: 'long' } },
        },
        {
          destination: 'dts-default.d.ts',
          format: typescriptEs6Declarations,
          options: { showFileHeader: false },
        },
        {
          destination: 'dts-short.d.ts',
          format: typescriptEs6Declarations,
          options: { showFileHeader: false, formatting: { commentStyle: 'short' } },
        },
        {
          destination: 'dts-long.d.ts',
          format: typescriptEs6Declarations,
          options: { showFileHeader: false, formatting: { commentStyle: 'long' } },
        },
      ],
    },
  },
};

function readOutput(destination) {
  return fs.readFileSync(resolve(`${buildPath}${destination}`), { encoding: 'UTF-8' });
}

describe('integration', () => {
  let es6Default = '';
  let es6Short = '';
  let es6Long = '';
  let dtsDefault = '';
  let dtsShort = '';
  let dtsLong = '';

  before(async () => {
    clearOutput(buildPath);
    const sd = new StyleDictionary(config);
    await sd.buildAllPlatforms();

    es6Default = readOutput('es6-default.js');
    es6Short = readOutput('es6-short.js');
    es6Long = readOutput('es6-long.js');
    dtsDefault = readOutput('dts-default.d.ts');
    dtsShort = readOutput('dts-short.d.ts');
    dtsLong = readOutput('dts-long.d.ts');
  });

  after(() => {
    clearOutput(buildPath);
  });

  describe('javascript/es6 comment output', () => {
    it('behaves like commentStyle short when commentStyle is unspecified', () => {
      expect(es6Default).to.equal(es6Short);
      expect(es6Default).to.match(
        /export const primary = ["']#ffffff["']; \/\/ Primary background color/,
      );
      expect(es6Default).to.match(
        /\/\/ Muted background color\s+\/\/ Used for read-only surfaces\s+export const muted/,
      );
    });

    it('commentStyle short keeps existing inline // comment output', () => {
      expect(es6Short).to.match(
        /export const primary = ["']#ffffff["']; \/\/ Primary background color/,
      );
      expect(es6Short).to.match(
        /\/\/ Muted background color\s+\/\/ Used for read-only surfaces\s+export const muted = ["']#fafbf9["'];/,
      );
      expect(es6Short).to.not.include('/** Primary background color */');
    });

    it('commentStyle long keeps existing /** */ comment output', () => {
      expect(es6Long).to.include('/** Primary background color */');
      expect(es6Long).to.not.include('// Primary background color');
      expect(es6Long).to.match(/export const primary = ["']#ffffff["'];/);
      expect(es6Long).to.match(
        /\/\*\*\s+\* Muted background color\s+\* Used for read-only surfaces\s+\*\/\s+export const muted = ["']#fafbf9["'];/,
      );
    });
  });

  describe('typescript/es6-declarations comment output', () => {
    it('behaves like commentStyle long when commentStyle is unspecified', () => {
      expect(dtsDefault).to.equal(dtsLong);
      expect(dtsDefault).to.match(
        /\/\*\* Primary background color \*\/\s+export const primary: string;/,
      );
      expect(dtsDefault).to.match(
        /\/\*\*\s+\* Muted background color\s+\* Used for read-only surfaces\s+\*\/\s+export const muted: string;/,
      );
    });

    it('commentStyle short keeps existing // comment output', () => {
      expect(dtsShort).to.match(/\/\/ Primary background color\s+export const primary: string;/);
      expect(dtsShort).to.match(
        /\/\/ Muted background color\s+\/\/ Used for read-only surfaces\s+export const muted: string;/,
      );
      expect(dtsShort).to.not.include('/** Primary background color */');
    });

    it('commentStyle long keeps existing /** */ comment output', () => {
      expect(dtsLong).to.include('/** Primary background color */');
      expect(dtsLong).to.not.include('// Primary background color');
      expect(dtsLong).to.match(
        /\/\*\* Primary background color \*\/\s+export const primary: string;/,
      );
      expect(dtsLong).to.match(/export const muted: string;/);
    });
  });
});
