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

/**
 * A gate is a promise that the other platform's file opens from its async
 * fileHeader hook. The waiting hook arms a fallback timer right before it
 * awaits, so a build that formats the platforms one after another still
 * finishes instead of hanging.
 */
function createGate(fallbackMs = 500) {
  let open;
  let released = false;
  let timer;
  const promise = new Promise((resolve) => {
    open = resolve;
  });
  return {
    promise,
    arm() {
      if (!released && !timer) {
        timer = setTimeout(() => open(), fallbackMs);
      }
    },
    release() {
      released = true;
      if (timer) clearTimeout(timer);
      open();
    },
  };
}

/**
 * The platforms are formatted concurrently; whichever platform is declared
 * first starts formatting first, so `betaFirst` flips the order in which the
 * two platforms reach their count/flush step.
 */
function createConfig({ betaFirst = false } = {}) {
  const alphaReady = createGate();
  const gateAlpha = createGate();

  const alphaPlatform = {
    transformGroup: css,
    buildPath,
    files: [
      {
        destination: 'alpha.css',
        format: cssVariables,
        // only filters a token that nothing references
        filter: exclude('unused'),
        options: {
          outputReferences: true,
          // opens beta.css's gate first, so this file resumes and reaches its
          // count/flush step while the other platform's file is mid-format
          fileHeader: async () => {
            alphaReady.release();
            gateAlpha.arm();
            await gateAlpha.promise;
            return [];
          },
        },
      },
    ],
  };

  const betaPlatform = {
    transformGroup: css,
    buildPath,
    files: [
      {
        destination: 'beta.css',
        format: cssVariables,
        // excludes the token that danger references
        filter: exclude('colors.red'),
        options: {
          outputReferences: true,
          fileHeader: async () => {
            alphaReady.arm();
            await alphaReady.promise;
            gateAlpha.release();
            await null;
            return [];
          },
        },
      },
    ],
  };

  return {
    log: { verbosity: verbose },
    tokens,
    platforms: betaFirst
      ? { beta: betaPlatform, alpha: alphaPlatform }
      : { alpha: alphaPlatform, beta: betaPlatform },
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

function expectAttribution(messages) {
  const warning = filteredWarningFor(messages, 'beta.css');
  expect(warning, 'beta.css should report the filtered-out reference').to.be.a('string');
  expect(warning).to.include('colors.red');
  expect(filteredWarningFor(messages, 'alpha.css')).to.be.undefined;
  expect(isSuccessFor(messages, 'alpha.css'), 'alpha.css should log success').to.equal(true);
}

describe('integration', () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('logging', () => {
    describe('filtered reference attribution across platforms', () => {
      it('reports the warning under the platform file that filtered the token', async () => {
        expectAttribution(await buildAndCapture(createConfig()));
      });

      it('reports the warning under the same platform file when the platforms are declared in the opposite order', async () => {
        expectAttribution(await buildAndCapture(createConfig({ betaFirst: true })));
      });
    });
  });
});
