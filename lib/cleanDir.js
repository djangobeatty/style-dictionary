import chalk from 'chalk';
import { dirname } from 'path-unified/posix';
import { joinPath, normalizeSeparators } from './utils/joinPath.js';
import { fs } from 'style-dictionary/fs';
import { logVerbosityLevels } from './enums/index.js';

/**
 * @typedef {import('../types/Volume.d.ts').Volume} Volume
 * @typedef {import('../types/Config.d.ts').PlatformConfig} Config
 * @typedef {import('../types/File.d.ts').File} File
 */

/**
 * Takes the style property object and a format and returns a
 * string that can be written to a file.
 * @memberOf StyleDictionary
 * @param {File} file
 * @param {Config} [platform]
 * @param {Volume} [vol]
 */
export default async function cleanDir(file, platform = {}, vol = fs) {
  let { destination } = file;

  if (typeof destination !== 'string') throw new Error('Please enter a valid destination');

  // if there is a build path, prepend the destination with it
  // buildPath and destination may use either `/` or `\` as separator,
  // they are normalized to posix separators before joining
  if (platform.buildPath) {
    destination = joinPath(platform.buildPath, destination);
  } else {
    destination = normalizeSeparators(destination);
  }

  let dir = dirname(destination);

  while (dir) {
    if (vol.existsSync(dir)) {
      const dirContents = vol.readdirSync(dir, 'buffer');
      if (dirContents.length === 0) {
        if (platform.log?.verbosity !== logVerbosityLevels.silent) {
          // eslint-disable-next-line no-console
          console.log(chalk.bold.red('-') + ' ' + dir);
        }
        vol.rmSync(dir, { recursive: true });
      } else {
        break;
      }
    }

    const splitDir = dir.split('/');
    splitDir.pop();
    dir = splitDir.join('/');
  }
}
