import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { fs } from 'style-dictionary/fs';
import { resolve } from '../lib/resolve.js';
import { buildPath } from './_constants.js';
import { clearOutput } from '../__tests__/__helpers.js';
import { commentStyles, formats, transformGroups } from '../lib/enums/index.js';

const { none } = commentStyles;
const { javascriptEs6 } = formats;
const { js } = transformGroups;

// DTCG syntax: $description instead of comment, detected as usesDtcg
const tokens = {
  color: {
    state: {
      background: {
        disabled: {
          $value: '#f4f5f2',
          $type: 'color',
          $description: 'Background for disabled state',
        },
        readonly: {
          $value: '#fafbf9',
          $type: 'color',
          $description: 'Background for readonly state',
        },
      },
    },
  },
};

const readFile = (destination) =>
  fs.readFileSync(resolve(`${buildPath}${destination}`), { encoding: 'UTF-8' });

// executable output lines only: skips blank lines and the generated file header comment
const codeLines = (output) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('*') && line !== '/**' && !line.startsWith('//'));

describe('integration', async () => {
  before(async () => {
    clearOutput(buildPath);
    const sd = new StyleDictionary({
      tokens,
      platforms: {
        js: {
          transformGroup: js,
          buildPath,
          files: [
            {
              destination: 'dtcgColorNoComments.js',
              format: javascriptEs6,
              options: {
                formatting: {
                  commentStyle: none,
                },
              },
            },
            {
              destination: 'dtcgColorComments.js',
              format: javascriptEs6,
            },
          ],
        },
      },
    });
    await sd.buildAllPlatforms();
  });

  after(() => {
    clearOutput(buildPath);
  });

  describe(javascriptEs6, async () => {
    it('should suppress $description comments when commentStyle is none', async () => {
      const output = readFile('dtcgColorNoComments.js');

      expect(output).to.not.include('undefined');
      expect(output).to.not.include('Background for disabled state');
      expect(output).to.not.include('Background for readonly state');
      const lines = codeLines(output);
      expect(lines.length).to.equal(2);
      lines.forEach((line) => {
        expect(line).to.match(/^export const \w+ = "#[0-9a-fA-F]{6}";$/);
      });
      expect(lines.map((line) => line.split('"')[1]).sort()).to.deep.equal(['#f4f5f2', '#fafbf9']);

      // without the commentStyle override the same tokens render their comments
      const commented = readFile('dtcgColorComments.js');
      expect(commented).to.not.include('undefined');
      expect(commented).to.include('// Background for disabled state');
      expect(commented).to.include('// Background for readonly state');
    });
  });
});
