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
 * it awaits, so a build that formats its files one after another (and
 * therefore never opens the gate) still finishes instead of hanging.
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
  const siblingReady = createGate();
  const gateSibling = createGate();

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
              // opens the sibling's gate first, so this file resumes and
              // reaches its count/flush step while filtered.css is still
              // in the middle of formatting
              fileHeader: async () => {
                siblingReady.release();
                gateSibling.arm();
                await gateSibling.promise;
                return [];
              },
            },
          },
          {
            destination: 'filtered.css',
            format: cssVariables,
            // excludes a token that danger references, so this file has a
            // filtered-out reference of its own
            filter: exclude('colors.red'),
            options: {
              outputReferences: true,
              fileHeader: async () => {
                siblingReady.arm();
                await siblingReady.promise;
                gateSibling.release();
                await null;
                return [];
              },
            },
          },
          {
            destination: 'unrelated.css',
            format: cssVariables,
            // only filters a token that nothing references
            filter: exclude('unused'),
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
    describe('filtered reference attribution per file', () => {
      it('warns about the references that the file itself filtered out, not its siblings', async () => {
        const messages = await buildAndCapture(createConfig());
        const warning = filteredWarningFor(messages, 'filtered.css');
        expect(warning, 'filtered.css should report the filtered-out reference').to.be.a('string');
        // lists the reference that this file's own filter excluded
        expect(warning).to.include('colors.red');
        expect(filteredWarningFor(messages, 'all.css')).to.be.undefined;
        expect(filteredWarningFor(messages, 'unrelated.css')).to.be.undefined;
      });

      it('logs a successful build for files that filtered out no referenced token', async () => {
        const messages = await buildAndCapture(createConfig());
        // the sibling that did filter out a referenced token still warns...
        expect(
          filteredWarningFor(messages, 'filtered.css'),
          'filtered.css should produce the warning in this build',
        ).to.be.a('string');
        // ...while files without filtered-out references log success
        expect(isSuccessFor(messages, 'all.css'), 'all.css should log success').to.equal(true);
        expect(
          isSuccessFor(messages, 'unrelated.css'),
          'unrelated.css should log success',
        ).to.equal(true);
        expect(filteredWarningFor(messages, 'all.css')).to.be.undefined;
        expect(filteredWarningFor(messages, 'unrelated.css')).to.be.undefined;
      });
    });
  });
});
