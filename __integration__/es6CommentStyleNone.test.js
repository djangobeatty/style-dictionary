import { expect } from 'chai';
import formats from '../lib/common/formats.js';
import createFormatArgs from '../lib/utils/createFormatArgs.js';
import { convertTokenData } from '../lib/utils/convertTokenData.js';
import { commentStyles, formats as fileFormats } from '../lib/enums/index.js';

const { javascriptEs6 } = fileFormats;
const { none } = commentStyles;

const file = {
  destination: 'output.js',
  format: javascriptEs6,
};

const commentTokens = {
  color: {
    red: {
      comment: 'Primary brand red',
      name: 'red',
      original: {
        value: '#EF5350',
      },
      path: ['color', 'red'],
      type: 'color',
      value: '#EF5350',
    },
    blue: {
      comment: 'Accent blue',
      name: 'blue',
      original: {
        value: '#4FEDF0',
      },
      path: ['color', 'blue'],
      type: 'color',
      value: '#4FEDF0',
    },
  },
};

const multilineTokens = {
  color: {
    red: {
      comment: 'Primary brand red\nUsed across surfaces',
      name: 'red',
      original: {
        value: '#EF5350',
      },
      path: ['color', 'red'],
      type: 'color',
      value: '#EF5350',
    },
  },
};

const DTCGTokens = {
  color: {
    red: {
      $description: 'Primary brand red',
      name: 'red',
      original: {
        $value: '#EF5350',
      },
      path: ['color', 'red'],
      $type: 'color',
      $value: '#EF5350',
    },
  },
};

const noCommentTokens = {
  color: {
    red: {
      name: 'red',
      original: {
        value: '#EF5350',
      },
      path: ['color', 'red'],
      type: 'color',
      value: '#EF5350',
    },
  },
};

const format = formats[javascriptEs6];

// formatting omitted renders with the format's default comment style
const render = ({ tokens, usesDtcg = false, formatting }) =>
  format(
    createFormatArgs({
      dictionary: {
        tokens,
        allTokens: convertTokenData(tokens, { output: 'array', usesDtcg }),
      },
      file: formatting ? { ...file, options: { formatting } } : file,
      platform: {},
      options: { usesDtcg },
    }),
  );

// executable output lines only: skips blank lines and the generated file header comment
const codeLines = (output) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('*') && line !== '/**' && !line.startsWith('//'));

describe('formats', () => {
  describe(javascriptEs6, () => {
    it('should suppress comments and not emit undefined when commentStyle is none', async () => {
      const output = await render({ tokens: commentTokens, formatting: { commentStyle: none } });

      expect(output).to.not.include('undefined');
      expect(output).to.not.include('Primary brand red');
      expect(output).to.not.include('Accent blue');
      expect(codeLines(output)).to.deep.equal([
        'export const red = "#EF5350";',
        'export const blue = "#4FEDF0";',
      ]);

      // the same tokens still render inline comments with the default comment style
      const commented = await render({ tokens: commentTokens });
      expect(codeLines(commented)).to.deep.equal([
        'export const red = "#EF5350"; // Primary brand red',
        'export const blue = "#4FEDF0"; // Accent blue',
      ]);

      // tokens without comments are unaffected by commentStyle none
      const plain = await render({ tokens: noCommentTokens, formatting: { commentStyle: none } });
      expect(codeLines(plain)).to.deep.equal(['export const red = "#EF5350";']);
    });

    it('should suppress $description and not emit undefined when commentStyle is none', async () => {
      const output = await render({
        tokens: DTCGTokens,
        usesDtcg: true,
        formatting: { commentStyle: none },
      });

      expect(output).to.not.include('undefined');
      expect(output).to.not.include('Primary brand red');
      expect(codeLines(output)).to.deep.equal(['export const red = "#EF5350";']);

      // the same token still renders its $description with the default comment style
      const commented = await render({ tokens: DTCGTokens, usesDtcg: true });
      expect(codeLines(commented)).to.deep.equal([
        'export const red = "#EF5350"; // Primary brand red',
      ]);
    });

    it('should not emit undefined for multiline comments when commentStyle is none', async () => {
      const output = await render({ tokens: multilineTokens, formatting: { commentStyle: none } });

      expect(output).to.not.include('undefined');
      expect(output).to.not.include('Used across surfaces');
      expect(codeLines(output)).to.deep.equal(['export const red = "#EF5350";']);

      // the default comment style renders the multiline comment above the token
      const commented = await render({ tokens: multilineTokens });
      expect(commented).to.include('export const red = "#EF5350";');
      expect(commented).to.include('// Primary brand red\n// Used across surfaces');
    });
  });
});
