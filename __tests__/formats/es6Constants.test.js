import { expect } from 'chai';
import formats from '../../lib/common/formats.js';
import createFormatArgs from '../../lib/utils/createFormatArgs.js';
import { convertTokenData } from '../../lib/utils/convertTokenData.js';
import { commentStyles, formats as fileFormats } from '../../lib/enums/index.js';

const { javascriptEs6 } = fileFormats;
const { none } = commentStyles;

const file = {
  destination: 'output.js',
  format: javascriptEs6,
  filter: {
    type: 'color',
  },
};

const tokens = {
  color: {
    red: {
      comment: 'comment',
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
      $description: 'comment',
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

const commentTokens = {
  color: {
    red: {
      comment: 'comment',
      name: 'red',
      original: {
        value: '#EF5350',
      },
      path: ['color', 'red'],
      type: 'color',
      value: '#EF5350',
    },
    blue: {
      comment: 'multiline\ncomment',
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

const format = formats[javascriptEs6];

describe('formats', () => {
  describe(javascriptEs6, () => {
    const formatArgs = (usesDtcg, options = {}) =>
      createFormatArgs({
        dictionary: {
          tokens: usesDtcg ? DTCGTokens : tokens,
          allTokens: convertTokenData(usesDtcg ? DTCGTokens : tokens, {
            output: 'array',
            usesDtcg,
          }),
        },
        file,
        platform: {},
        options: { usesDtcg, ...options },
      });

    it('should be a valid JS file and match snapshot', async () => {
      const output = await format(formatArgs(false));

      await expect(output).to.matchSnapshot();
    });

    it('should handle DTCG token format, be a valid JS file and matches snapshot', async () => {
      const output = await format(formatArgs(true));

      await expect(output).to.matchSnapshot();
    });

    it('should handle multiline comments', async () => {
      const output = await format(
        createFormatArgs({
          dictionary: {
            tokens: commentTokens,
            allTokens: convertTokenData(commentTokens, { output: 'array' }),
          },
          file,
          platform: {},
        }),
      );
      await expect(output).to.matchSnapshot();
    });

    it('should not output comments when commentStyle is none', async () => {
      const output = await format(
        createFormatArgs({
          dictionary: {
            tokens: commentTokens,
            allTokens: convertTokenData(commentTokens, { output: 'array' }),
          },
          file,
          platform: {},
          options: { formatting: { commentStyle: none } },
        }),
      );

      expect(output).to.equal(`/**
 * Do not edit directly, this file was auto-generated.
 */

export const red = "#EF5350";
export const blue = "#4FEDF0";
`);
    });

    it('should not output comments when commentStyle is none for DTCG tokens', async () => {
      const output = await format(formatArgs(true, { formatting: { commentStyle: none } }));

      expect(output).to.equal(`/**
 * Do not edit directly, this file was auto-generated.
 */

export const red = "#EF5350";
`);
    });
  });
});
