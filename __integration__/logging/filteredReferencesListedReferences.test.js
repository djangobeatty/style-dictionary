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
 * A gate is a promise that another concurrently formatted file opens from its
 * async fileHeader hook. The waiting hook arms a fallback timer right before
 * it awaits, so a build that formats its files one after another still
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

function createConfig() {
  const aReady = createGate();
  const gateA = createGate();

  return {
    log: { verbosity: verbose },
    tokens,
    platforms: {
      css: {
        transformGroup: css,
        buildPath,
        files: [
          {
            destination: 'a.css',
            format: cssVariables,
            // excludes the token that danger references
            filter: exclude('colors.red'),
            options: {
              outputReferences: true,
              // opens b.css's gate first, so this file resumes and reaches
              // its count/flush step while b.css is still mid-format
              fileHeader: async () => {
                aReady.release();
                gateA.arm();
                await gateA.promise;
                return [];
              },
            },
          },
          {
            destination: 'b.css',
            format: cssVariables,
            // excludes the token that success references
            filter: exclude('colors.green'),
            options: {
              outputReferences: true,
              fileHeader: async () => {
                aReady.arm();
                await aReady.promise;
                gateA.release();
                await null;
                return [];
              },
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

describe('integration', () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('logging', () => {
    describe('filtered reference contents per file', () => {
      it('lists only the references that the file itself filtered out', async () => {
        const messages = await buildAndCapture(createConfig());

        // a.css excluded colors.red; the reference that only b.css excluded
        // (colors.green) must not show up in a.css's warning
        const warningA = filteredWarningFor(messages, 'a.css');
        expect(warningA, 'a.css should report its own filtered-out reference').to.be.a('string');
        expect(warningA).to.include('colors.red');
        expect(warningA).to.not.include('colors.green');

        const warningB = filteredWarningFor(messages, 'b.css');
        expect(warningB, 'b.css should report its own filtered-out reference').to.be.a('string');
        expect(warningB).to.include('colors.green');
        expect(warningB).to.not.include('colors.red');
      });
    });
  });
});
