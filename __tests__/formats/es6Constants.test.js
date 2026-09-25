import { expect } from 'chai';
import formats from '../../lib/common/formats.js';
import createFormatArgs from '../../lib/utils/createFormatArgs.js';
import { convertTokenData } from '../../lib/utils/convertTokenData.js';
import { commentStyles, formats as fileFormats } from '../../lib/enums/index.js';

const { javascriptEs6 } = fileFormats;

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
    const formatArgs = (usesDtcg) =>
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
        options: { usesDtcg },
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

    it('should suppress comments without outputting undefined when commentStyle is none', async () => {
      const noCommentFile = {
        ...file,
        options: {
          formatting: {
            commentStyle: commentStyles.none,
          },
        },
      };

      const output = await format(
        createFormatArgs({
          dictionary: {
            tokens,
            allTokens: convertTokenData(tokens, { output: 'array' }),
          },
          file: noCommentFile,
          platform: {},
        }),
      );

      expect(output).to.not.contain('undefined');
      expect(output).to.equal(
        [
          '/**',
          ' * Do not edit directly, this file was auto-generated.',
          ' */',
          '',
          'export const red = "#EF5350";',
          '',
        ].join('\n'),
      );
    });

    it('should suppress DTCG $description comments when commentStyle is none', async () => {
      const noCommentFile = {
        ...file,
        options: {
          formatting: {
            commentStyle: commentStyles.none,
          },
        },
      };

      const output = await format(
        createFormatArgs({
          dictionary: {
            tokens: DTCGTokens,
            allTokens: convertTokenData(DTCGTokens, { output: 'array', usesDtcg: true }),
          },
          file: noCommentFile,
          platform: {},
          options: { usesDtcg: true },
        }),
      );

      expect(output).to.not.contain('undefined');
      expect(output).to.contain('export const red = "#EF5350";');
    });
  });
});
