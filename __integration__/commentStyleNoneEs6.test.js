import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { commentPositions, commentStyles, formats, transforms } from '../lib/enums/index.js';

const { javascriptEs6 } = formats;
const { none, short } = commentStyles;
const { above } = commentPositions;
const { nameCamel } = transforms;

const SINGLE_LINE_DESCRIPTION = 'Disabled background';
const MULTI_LINE_FIRST = 'Readonly background';
const MULTI_LINE_SECOND = 'spans two lines';
const MULTI_LINE_DESCRIPTION = `${MULTI_LINE_FIRST}\n${MULTI_LINE_SECOND}`;

// The two declarations, back to back, with nothing in between them.
const DECLARATIONS =
  'export const colorStateBackgroundDisabled = "#f4f5f2";\n' +
  'export const colorStateBackgroundReadonly = "#fafbf9";\n';

/**
 * @param {{ withDescriptions: boolean; usesDtcg: boolean }} opts
 */
const createTokens = ({ withDescriptions, usesDtcg }) => {
  const token = (value, description) => ({
    ...(usesDtcg ? { $value: value, $type: 'color' } : { value, type: 'color' }),
    ...(withDescriptions
      ? usesDtcg
        ? { $description: description }
        : { comment: description }
      : {}),
  });
  return {
    color: {
      stateBackgroundDisabled: token('#f4f5f2', SINGLE_LINE_DESCRIPTION),
      stateBackgroundReadonly: token('#fafbf9', MULTI_LINE_DESCRIPTION),
    },
  };
};

const build = async ({
  withDescriptions,
  usesDtcg = false,
  fileFormatting,
  platformFormatting,
}) => {
  const sd = new StyleDictionary({
    log: { verbosity: 'silent' },
    tokens: createTokens({ withDescriptions, usesDtcg }),
    platforms: {
      js: {
        transforms: [nameCamel],
        options: platformFormatting ? { formatting: platformFormatting } : {},
        files: [
          {
            destination: 'tokens.js',
            format: javascriptEs6,
            options: fileFormatting ? { formatting: fileFormatting } : {},
          },
        ],
      },
    },
  });
  const { js } = await sd.formatAllPlatforms();
  return js[0].output;
};

const expectNoComments = (output) => {
  expect(output).to.not.include('undefined');
  expect(output).to.not.include(SINGLE_LINE_DESCRIPTION);
  expect(output).to.not.include(MULTI_LINE_FIRST);
  expect(output).to.not.include(MULTI_LINE_SECOND);
  expect(output).to.include(DECLARATIONS);
};

describe('integration', () => {
  describe(`${javascriptEs6} with commentStyle none`, () => {
    it('should suppress comments of tokens that have a comment', async () => {
      const output = await build({
        withDescriptions: true,
        fileFormatting: { commentStyle: none },
      });
      const withoutDescriptions = await build({
        withDescriptions: false,
        fileFormatting: { commentStyle: none },
      });

      expectNoComments(output);
      expect(output).to.equal(withoutDescriptions);
    });

    it('should suppress comments of DTCG tokens that have a $description', async () => {
      const output = await build({
        withDescriptions: true,
        usesDtcg: true,
        fileFormatting: { commentStyle: none },
      });
      const withoutDescriptions = await build({
        withDescriptions: false,
        usesDtcg: true,
        fileFormatting: { commentStyle: none },
      });

      expectNoComments(output);
      expect(output).to.equal(withoutDescriptions);
    });

    it('should suppress comments when commentPosition is above', async () => {
      const output = await build({
        withDescriptions: true,
        fileFormatting: { commentStyle: none, commentPosition: above },
      });
      const withoutDescriptions = await build({
        withDescriptions: false,
        fileFormatting: { commentStyle: none, commentPosition: above },
      });

      expectNoComments(output);
      expect(output).to.equal(withoutDescriptions);
    });

    it('should suppress comments when commentStyle none is inherited from the platform', async () => {
      const output = await build({
        withDescriptions: true,
        platformFormatting: { commentStyle: none },
      });
      const withoutDescriptions = await build({
        withDescriptions: false,
        platformFormatting: { commentStyle: none },
      });

      expectNoComments(output);
      expect(output).to.equal(withoutDescriptions);
    });

    it('should still render the comments when commentStyle is short', async () => {
      const output = await build({
        withDescriptions: true,
        fileFormatting: { commentStyle: short },
      });

      expect(output).to.include(
        `export const colorStateBackgroundDisabled = "#f4f5f2"; // ${SINGLE_LINE_DESCRIPTION}`,
      );
      expect(output).to.not.include('undefined');
    });
  });
});
