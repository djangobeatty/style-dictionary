import { expect } from 'chai';
import { restore, stubMethod } from 'hanbi';
import StyleDictionary from 'style-dictionary';
import { buildPath, cleanConsoleOutput } from '../_constants.js';
import { clearOutput } from '../../__tests__/__helpers.js';
import { formats, logVerbosityLevels, transformGroups } from '../../lib/enums/index.js';

const { verbose } = logVerbosityLevels;
const { cssVariables } = formats;
const { css } = transformGroups;

const tokens = {
  colors: {
    red: { value: '#ff0000', type: 'color' },
    green: { value: '#00ff00', type: 'color' },
    blue: { value: '#0000ff', type: 'color' },
  },
  danger: { value: '{colors.red}', type: 'color' },
  success: { value: '{colors.green}', type: 'color' },
  unused: { value: '#123456', type: 'color' },
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
            destination: 'all.css',
            format: cssVariables,
            options: {
              outputReferences: true,
            },
          },
          {
            destination: 'filtered.css',
            format: cssVariables,
            // excludes the token that danger references while keeping
            // outputReferences on, so this file genuinely needs the warning
            filter: exclude('colors.red'),
            options: {
              outputReferences: true,
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

function filteredWarningFor(messages, destination) {
  return messages.find((message) =>
    message.includes(`While building ${destination}, filtered out token references were found`),
  );
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
    describe('filtered references with outputReferences: true', () => {
      it('still warns, under the right file, when a filter excludes a referenced token', async () => {
        const messages = await buildAndCapture(createConfig());

        const warning = filteredWarningFor(messages, 'filtered.css');
        expect(warning, 'filtered.css should warn about its filtered-out reference').to.be.a(
          'string',
        );
        // lists the reference that the filter excluded
        expect(warning).to.include('colors.red');

        expect(filteredWarningFor(messages, 'all.css')).to.be.undefined;
        expect(isSuccessFor(messages, 'all.css'), 'all.css should log success').to.equal(true);
      });
    });
  });
});
