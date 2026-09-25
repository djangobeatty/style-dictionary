import { expect } from 'chai';
import { restore, stubMethod } from 'hanbi';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { outputReferencesFilter } from 'style-dictionary/utils';
import { resolve } from '../../lib/resolve.js';
import { buildPath, cleanConsoleOutput } from '../_constants.js';
import { clearOutput } from '../../__tests__/__helpers.js';
import { formats, logVerbosityLevels, transformGroups } from '../../lib/enums/index.js';

const { verbose } = logVerbosityLevels;
const { cssVariables } = formats;
const { css } = transformGroups;

const tokens = {
  colors: {
    red: { value: '#ff0000', type: 'color' },
    blue: { value: '#0000ff', type: 'color' },
  },
  danger: { value: '{colors.red}', type: 'color' },
  neutral: { value: '#123456', type: 'color' },
};

const exclude = (path) => (token) => !(Array.isArray(token.path) && token.path.join('.') === path);

function createConfig() {
  return {
    log: { verbosity: verbose },
    tokens,
    platforms: {
      css: {
        transformGroup: css,
        buildPath,
        files: [
          {
            destination: 'suppressed.css',
            format: cssVariables,
            // filters colors.red out while danger keeps referencing it, but
            // outputReferencesFilter suppresses that reference from the output
            filter: exclude('colors.red'),
            options: {
              outputReferences: outputReferencesFilter,
            },
          },
        ],
      },
    },
  };
}

async function buildAndCapture(config) {
  const stub = stubMethod(console, 'log');
  try {
    const sd = new StyleDictionary(config);
    await sd.buildAllPlatforms();
    return Array.from(stub.calls).flatMap((call) =>
      call.args.map((arg) => cleanConsoleOutput(`${arg}`)),
    );
  } finally {
    restore();
  }
}

function isSuccessFor(messages, destination) {
  return messages.some(
    (message) => message.includes('✔') && message.includes(`${buildPath}${destination}`),
  );
}

describe('integration', () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('logging', () => {
    describe('filtered references with outputReferencesFilter', () => {
      it('logs success with no filtered-out reference warning when all of them are suppressed', async () => {
        const messages = await buildAndCapture(createConfig());

        expect(
          isSuccessFor(messages, 'suppressed.css'),
          'suppressed.css should log success',
        ).to.equal(true);
        expect(
          messages.some((message) => message.includes('filtered out token references were found')),
          'no filtered-out reference warning should be logged',
        ).to.equal(false);

        const output = fs.readFileSync(resolve(`${buildPath}suppressed.css`), {
          encoding: 'UTF-8',
        });
        // the filtered-out reference is suppressed rather than emitted
        expect(output).to.not.include('var(');
      });
    });
  });
});
