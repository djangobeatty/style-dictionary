import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { commentPositions, commentStyles, formats, transforms } from '../lib/enums/index.js';

const { javascriptEs6, typescriptEs6Declarations } = formats;
const { short, long } = commentStyles;
const { above, inline } = commentPositions;
const { nameCamel } = transforms;

const SINGLE_LINE_DESCRIPTION = 'Disabled background';
const MULTI_LINE_FIRST = 'Readonly background';
const MULTI_LINE_SECOND = 'spans two lines';
const MULTI_LINE_DESCRIPTION = `${MULTI_LINE_FIRST}\n${MULTI_LINE_SECOND}`;

const JS_DISABLED = 'export const colorStateBackgroundDisabled = "#f4f5f2";';
const JS_READONLY = 'export const colorStateBackgroundReadonly = "#fafbf9";';
const TS_DISABLED = 'export const colorStateBackgroundDisabled: string;';
const TS_READONLY = 'export const colorStateBackgroundReadonly: string;';

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

const build = async ({ format, destination, formatting }) => {
  const sd = new StyleDictionary({
    log: { verbosity: 'silent' },
    tokens,
    platforms: {
      out: {
        transforms: [nameCamel],
        files: [
          {
            destination,
            format,
            options: formatting ? { formatting } : {},
          },
        ],
      },
    },
  });
  const { out } = await sd.formatAllPlatforms();
  return out[0].output;
};

const buildJs = (formatting) =>
  build({ format: javascriptEs6, destination: 'tokens.js', formatting });
const buildTs = (formatting) =>
  build({ format: typescriptEs6Declarations, destination: 'tokens.d.ts', formatting });

describe('integration', () => {
  describe(`${javascriptEs6} comment rendering`, () => {
    it('should render short comments inline by default', async () => {
      const output = await buildJs(undefined);

      expect(output).to.include(`${JS_DISABLED} // ${SINGLE_LINE_DESCRIPTION}`);
      expect(output).to.include(`// ${MULTI_LINE_FIRST}\n// ${MULTI_LINE_SECOND}\n${JS_READONLY}`);
      expect(output).to.not.include('undefined');
    });

    it('should render short comments inline when commentPosition is inline', async () => {
      const output = await buildJs({ commentStyle: short, commentPosition: inline });

      expect(output).to.include(`${JS_DISABLED} // ${SINGLE_LINE_DESCRIPTION}`);
      expect(output).to.include(`// ${MULTI_LINE_FIRST}\n// ${MULTI_LINE_SECOND}\n${JS_READONLY}`);
      expect(output).to.not.include('undefined');
    });

    it('should render short comments above when commentPosition is above', async () => {
      const output = await buildJs({ commentStyle: short, commentPosition: above });

      expect(output).to.include(`// ${SINGLE_LINE_DESCRIPTION}\n${JS_DISABLED}`);
      expect(output).to.include(`// ${MULTI_LINE_FIRST}\n// ${MULTI_LINE_SECOND}\n${JS_READONLY}`);
      expect(output).to.not.include('undefined');
    });

    it('should render long comments inline when commentPosition is inline', async () => {
      const output = await buildJs({ commentStyle: long, commentPosition: inline });

      // The js format runs its output through prettier, which wraps this declaration
      // over two lines, so anchor on the value plus its trailing comment instead.
      expect(output).to.include('export const colorStateBackgroundDisabled =');
      expect(output).to.include(`"#f4f5f2"; /** ${SINGLE_LINE_DESCRIPTION} */`);
      expect(output).to.include(
        `/**\n * ${MULTI_LINE_FIRST}\n * ${MULTI_LINE_SECOND}\n */\n${JS_READONLY}`,
      );
      expect(output).to.not.include('undefined');
    });

    it('should render long comments above when commentPosition is above', async () => {
      const output = await buildJs({ commentStyle: long, commentPosition: above });

      expect(output).to.include(`/** ${SINGLE_LINE_DESCRIPTION} */\n${JS_DISABLED}`);
      expect(output).to.include(
        `/**\n * ${MULTI_LINE_FIRST}\n * ${MULTI_LINE_SECOND}\n */\n${JS_READONLY}`,
      );
      expect(output).to.not.include('undefined');
    });
  });

  describe(`${typescriptEs6Declarations} comment rendering`, () => {
    it('should render long comments above by default', async () => {
      const output = await buildTs(undefined);

      expect(output).to.include(`/** ${SINGLE_LINE_DESCRIPTION} */\n${TS_DISABLED}`);
      expect(output).to.include(
        `/**\n * ${MULTI_LINE_FIRST}\n * ${MULTI_LINE_SECOND}\n */\n${TS_READONLY}`,
      );
      expect(output).to.not.include('undefined');
    });

    it('should render long comments inline when commentPosition is inline', async () => {
      const output = await buildTs({ commentStyle: long, commentPosition: inline });

      expect(output).to.include(`${TS_DISABLED} /** ${SINGLE_LINE_DESCRIPTION} */`);
      expect(output).to.include(
        `/**\n * ${MULTI_LINE_FIRST}\n * ${MULTI_LINE_SECOND}\n */\n${TS_READONLY}`,
      );
      expect(output).to.not.include('undefined');
    });

    it('should render short comments inline when commentPosition is inline', async () => {
      const output = await buildTs({ commentStyle: short, commentPosition: inline });

      expect(output).to.include(`${TS_DISABLED} // ${SINGLE_LINE_DESCRIPTION}`);
      expect(output).to.include(`// ${MULTI_LINE_FIRST}\n// ${MULTI_LINE_SECOND}\n${TS_READONLY}`);
      expect(output).to.not.include('undefined');
    });

    it('should render short comments above when commentPosition is above', async () => {
      const output = await buildTs({ commentStyle: short, commentPosition: above });

      expect(output).to.include(`// ${SINGLE_LINE_DESCRIPTION}\n${TS_DISABLED}`);
      expect(output).to.include(`// ${MULTI_LINE_FIRST}\n// ${MULTI_LINE_SECOND}\n${TS_READONLY}`);
      expect(output).to.not.include('undefined');
    });
  });
});
