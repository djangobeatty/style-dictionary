import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { commentStyles, formats, transforms } from '../lib/enums/index.js';

const {
  cssVariables,
  scssVariables,
  scssMapFlat,
  scssMapDeep,
  lessVariables,
  stylusVariables,
  javascriptEs6,
  typescriptEs6Declarations,
  composeObject,
  iosSwiftClassSwift,
  flutterClassDart,
} = formats;
const { none, short } = commentStyles;
const { nameCamel } = transforms;

const SINGLE_LINE_DESCRIPTION = 'Disabled background';
const MULTI_LINE_DESCRIPTION = 'Readonly background\nspans two lines';
const TOKEN_NAME = 'colorStateBackgroundDisabled';

const tokens = {
  color: {
    stateBackgroundDisabled: {
      value: '#f4f5f2',
      type: 'color',
      comment: SINGLE_LINE_DESCRIPTION,
    },
    stateBackgroundReadonly: {
      value: '#fafbf9',
      type: 'color',
      comment: MULTI_LINE_DESCRIPTION,
    },
  },
};

// Every built-in format that renders token comments, with the options each of
// them needs to produce a complete file.
const commentCapableFormats = [
  { format: cssVariables, destination: 'tokens.css', fileOptions: {} },
  { format: scssVariables, destination: 'tokens.scss', fileOptions: {} },
  { format: scssMapFlat, destination: 'map-flat.scss', fileOptions: {} },
  { format: scssMapDeep, destination: 'map-deep.scss', fileOptions: {} },
  { format: lessVariables, destination: 'tokens.less', fileOptions: {} },
  { format: stylusVariables, destination: 'tokens.styl', fileOptions: {} },
  { format: javascriptEs6, destination: 'tokens.js', fileOptions: {} },
  { format: typescriptEs6Declarations, destination: 'tokens.d.ts', fileOptions: {} },
  {
    format: composeObject,
    destination: 'Tokens.kt',
    fileOptions: { className: 'Tokens', packageName: 'com.example.tokens' },
  },
  {
    format: iosSwiftClassSwift,
    destination: 'Tokens.swift',
    fileOptions: { className: 'Tokens' },
  },
  { format: flutterClassDart, destination: 'tokens.dart', fileOptions: { className: 'Tokens' } },
];

const build = async ({ format, destination, fileOptions, fileFormatting, platformFormatting }) => {
  const sd = new StyleDictionary({
    log: { verbosity: 'silent' },
    tokens,
    platforms: {
      out: {
        transforms: [nameCamel],
        options: platformFormatting ? { formatting: platformFormatting } : {},
        files: [
          {
            destination,
            format,
            options: {
              ...fileOptions,
              ...(fileFormatting ? { formatting: fileFormatting } : {}),
            },
          },
        ],
      },
    },
  });
  const { out } = await sd.formatAllPlatforms();
  return out[0].output;
};

describe('integration', () => {
  describe('commentStyle none across built-in formats', () => {
    commentCapableFormats.forEach(({ format, destination, fileOptions }) => {
      it(`should not emit "undefined" for ${format} when commentStyle none is set on the file`, async () => {
        const output = await build({
          format,
          destination,
          fileOptions,
          fileFormatting: { commentStyle: none },
        });

        expect(output).to.be.a('string');
        expect(output).to.include(TOKEN_NAME);
        expect(output).to.not.include('undefined');
      });

      it(`should not emit "undefined" for ${format} when commentStyle none comes from the platform`, async () => {
        const output = await build({
          format,
          destination,
          fileOptions,
          platformFormatting: { commentStyle: none },
        });

        expect(output).to.be.a('string');
        expect(output).to.include(TOKEN_NAME);
        expect(output).to.not.include('undefined');
      });

      it(`should still render the token comment for ${format} when commentStyle is short`, async () => {
        const output = await build({
          format,
          destination,
          fileOptions,
          fileFormatting: { commentStyle: short },
        });

        expect(output).to.include(SINGLE_LINE_DESCRIPTION);
        expect(output).to.not.include('undefined');
      });
    });
  });
});
