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

/**
 * Builds the same two-file configuration, with a mode that decides which file
 * finishes formatting first:
 *  - 'sibling-finishes-first': all.css resumes and reaches its count/flush
 *    step while filtered.css is still recording its filtered-out reference.
 *  - 'recorder-finishes-first': filtered.css records and finishes before
 *    all.css resumes.
 */
function createConfig(mode) {
  const siblingReady = createGate();
  const gateSibling = createGate();

  const allFileHeader = async () => {
    siblingReady.release();
    gateSibling.arm();
    await gateSibling.promise;
    return [];
  };

  const filteredFileHeader =
    mode === 'recorder-finishes-first'
      ? async () => {
          siblingReady.arm();
          await siblingReady.promise;
          gateSibling.release();
          return [];
        }
      : async () => {
          siblingReady.arm();
          await siblingReady.promise;
          gateSibling.release();
          await null;
          return [];
        };

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
              fileHeader: allFileHeader,
            },
          },
          {
            destination: 'filtered.css',
            format: cssVariables,
            // excludes the token that danger references
            filter: exclude('colors.red'),
            options: {
              outputReferences: true,
              fileHeader: filteredFileHeader,
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

function expectAttribution(messages) {
  expect(
    filteredWarningFor(messages, 'filtered.css'),
    'filtered.css should report the filtered-out reference',
  ).to.be.a('string');
  expect(filteredWarningFor(messages, 'all.css')).to.be.undefined;
  expect(isSuccessFor(messages, 'all.css'), 'all.css should log success').to.equal(true);
}

describe('integration', () => {
  afterEach(() => {
    clearOutput(buildPath);
  });

  describe('logging', () => {
    describe('filtered reference attribution stability', () => {
      it('reports the warning against the same file on repeated builds of the same configuration', async () => {
        const first = await buildAndCapture(createConfig('sibling-finishes-first'));
        const second = await buildAndCapture(createConfig('sibling-finishes-first'));
        expectAttribution(first);
        expectAttribution(second);
      });

      it('reports the warning against the same file regardless of which file finishes formatting first', async () => {
        const siblingFirst = await buildAndCapture(createConfig('sibling-finishes-first'));
        const recorderFirst = await buildAndCapture(createConfig('recorder-finishes-first'));
        expectAttribution(siblingFirst);
        expectAttribution(recorderFirst);
      });
    });
  });
});
