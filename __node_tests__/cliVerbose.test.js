/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
import { expect } from 'chai';
import childProcess from 'child_process';
import fs from 'node:fs';
import { cleanConsoleOutput } from '../__integration__/_constants.js';

/**
 * The CLI's --verbose flag expands every category of build problem to every
 * occurrence:
 *
 * - reference errors: every error is listed and each entry identifies the
 *   reference chain (the tokens the reference passes through) as well as the
 *   token file where the broken reference is defined;
 * - token collisions (value collisions while merging source files and
 *   output-name collisions while building a file): every collision listed;
 * - filtered outputReferences warnings: every filtered-out reference listed.
 *
 * Without --verbose each of those stays a concise, bounded summary — the
 * default side is asserted here too so both modes are compared on the very
 * same fixtures.
 */
const fixtureDir = '__tests__/__output/cli-verbose-fixtures';
const outDir = `${fixtureDir}/out`;
const CHAIN_COUNT = 15;
const VALUE_PAIRS = 10;
const NAME_PAIRS = 14;
const FILTERED_PAIRS = 25;

function runCli(args) {
  const result = childProcess.spawnSync('node', ['./bin/style-dictionary.js', ...args], {
    encoding: 'utf-8',
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  return {
    status: result.status,
    stdout,
    stderr,
    output: cleanConsoleOutput(`${stdout}\n${stderr}`),
  };
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function writeJson(fileName, data) {
  fs.writeFileSync(`${fixtureDir}/${fileName}`, JSON.stringify(data, null, 2));
}

function brokenRefsFixture() {
  const tokens = {};
  for (let i = 0; i < CHAIN_COUNT; i++) {
    tokens[`chain${i}`] = {
      // chainN.top passes through chainN.mid, which references a token
      // (chainN.missing) that does not exist anywhere
      top: { value: `{chain${i}.mid.value}` },
      mid: { value: `{chain${i}.missing.value}` },
    };
  }
  return tokens;
}

// Both files define these same paths with different values, so merging
// them produces value collisions (4 colliding attributes per token: value,
// type, filePath, isSource = 40 collision messages for 10 token paths).
// The values are opaque strings on purpose: the platform configured for
// this fixture runs no transforms, so nothing parses them as numbers.
function valueCollisionFixture(prefix) {
  const size = {};
  for (let i = 0; i < VALUE_PAIRS; i++) {
    size[`pad${i}`] = { value: `${prefix}-${i}`, type: 'dimension' };
  }
  return { size };
}

function nameCollisionFixture() {
  const tokens = {};
  for (let i = 0; i < NAME_PAIRS; i++) {
    tokens[`alpha${i}`] = { [`dup${i}`]: { value: `a-${i}` } };
    tokens[`beta${i}`] = { [`dup${i}`]: { value: `b-${i}` } };
  }
  return tokens;
}

function filteredReferenceFixture() {
  const surfaces = {};
  for (let i = 0; i < FILTERED_PAIRS; i++) {
    const id = String(i).padStart(2, '0');
    surfaces[`base${id}`] = { value: '#aaaaaa' };
    surfaces[`bg${id}`] = { value: `{color.palette.surfaces.base${id}.value}` };
  }
  return { color: { palette: { surfaces } } };
}

function writeFixtures() {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.mkdirSync(fixtureDir, { recursive: true });

  // reference errors: chains of references ending in a missing token
  writeJson('broken-refs.json', brokenRefsFixture());
  writeJson('refs-config.json', {
    source: [`${fixtureDir}/broken-refs.json`],
    platforms: {
      css: { transformGroup: 'css' },
    },
  });

  // value collisions: two source files defining the same token paths.
  // The platform deliberately configures no transforms: the collision
  // report happens while the source files are merged, and the opaque
  // placeholder values must be able to survive the build untouched
  // (transformGroup 'css' would run size/rem over category 'size' and
  // throw on the non-numeric placeholder values).
  writeJson('value-a.json', valueCollisionFixture('a'));
  writeJson('value-b.json', valueCollisionFixture('b'));
  writeJson('value-config.json', {
    source: [`${fixtureDir}/value-a.json`, `${fixtureDir}/value-b.json`],
    platforms: {
      css: {
        buildPath: `${outDir}/`,
        files: [{ destination: 'value-collisions.css', format: 'css/variables' }],
      },
    },
  });

  // output-name collisions: pairs of tokens whose leaf keys share a name
  writeJson('name-config.json', {
    tokens: nameCollisionFixture(),
    platforms: {
      css: {
        buildPath: `${outDir}/`,
        files: [{ destination: 'name-collisions.css', format: 'css/variables' }],
      },
    },
  });

  // filtered outputReferences: a filter that drops every referenced base token
  const filteredConfig = `export default {
  tokens: ${JSON.stringify(filteredReferenceFixture(), null, 2)},
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: '${outDir}/',
      files: [
        {
          destination: 'filtered-references.css',
          format: 'css/variables',
          filter: (token) => token.path[token.path.length - 1].startsWith('bg'),
          options: { outputReferences: true },
        },
      ],
    },
  },
};
`;
  fs.writeFileSync(`${fixtureDir}/filtered-config.js`, filteredConfig);
}

describe('cli verbose', function () {
  this.timeout(120000);

  beforeEach(() => {
    writeFixtures();
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  describe('property reference errors', () => {
    it('build: by default the failure does not enumerate every reference error', () => {
      const { status, output } = runCli(['build', '-c', `${fixtureDir}/refs-config.json`]);
      // the build still fails...
      expect(status).to.not.equal(0);
      expect(output).to.match(/reference/i);
      // ...but a concise message: far fewer than the 30 collected
      // context occurrences (15 chain tops + 15 chain mids) are shown
      const contexts = output.match(/chain\d+\.(?:top|mid)\.value/g) || [];
      expect(contexts.length).to.be.below(15);
    });

    it('build --verbose: lists every reference error with its reference chain and source file', () => {
      const { status, output } = runCli([
        'build',
        '-c',
        `${fixtureDir}/refs-config.json`,
        '--verbose',
      ]);
      expect(output).to.not.include('unknown option');
      // errors are still thrown
      expect(status).to.not.equal(0);

      for (let i = 0; i < CHAIN_COUNT; i++) {
        // every hop of every broken reference chain is shown
        expect(output).to.include(`chain${i}.top`);
        expect(output).to.include(`chain${i}.mid`);
        expect(output).to.include(`chain${i}.missing`);
        // and the hops of a chain appear together in one entry, i.e. the
        // entry shows the reference chain rather than isolated paths
        const chainWindow = new RegExp(
          `chain${i}\\.top[\\s\\S]{0,400}chain${i}\\.mid|chain${i}\\.mid[\\s\\S]{0,400}chain${i}\\.top`,
        );
        expect(output).to.match(chainWindow);
      }

      // the file where the broken references are defined is identified,
      // repeatedly (per entry), not just once somewhere
      expect(output).to.include('broken-refs.json');
      expect(countOccurrences(output, 'broken-refs.json')).to.be.at.least(10);
    });
  });

  describe('token collisions', () => {
    it('build: by default value collisions are a concise bounded summary', () => {
      const { status, output } = runCli(['build', '-c', `${fixtureDir}/value-config.json`]);
      expect(status).to.equal(0);
      expect(output).to.match(/collision/i);
      // 10 colliding token paths, each colliding on 4 attributes
      // (value, type, filePath, isSource), produce 40 'Collision detected'
      // lines; the default report must stay bounded instead of listing them
      expect(output.length).to.be.below(2400);
      expect(countOccurrences(output, 'Collision detected')).to.be.below(20);
      let mentioned = 0;
      for (let i = 0; i < VALUE_PAIRS; i++) {
        if (output.includes(`size.pad${i}`)) mentioned++;
      }
      expect(mentioned).to.be.below(VALUE_PAIRS);
    });

    it('build --verbose: lists every value collision', () => {
      const { status, output } = runCli([
        'build',
        '-c',
        `${fixtureDir}/value-config.json`,
        '--verbose',
      ]);
      expect(output).to.not.include('unknown option');
      expect(status).to.equal(0);
      for (let i = 0; i < VALUE_PAIRS; i++) {
        expect(output).to.include(`size.pad${i}`);
      }
      expect(output.length).to.be.above(1400);
    });

    it('build: by default output-name collisions are a concise bounded summary', () => {
      const { status, output } = runCli(['build', '-c', `${fixtureDir}/name-config.json`]);
      expect(status).to.equal(0);
      expect(output).to.match(/collision/i);
      expect(output).to.include('name-collisions.css');
      // 14 colliding output names exist; the default report stays bounded
      expect(output.length).to.be.below(1100);
      expect(countOccurrences(output, 'was generated by')).to.be.below(7);
      let mentioned = 0;
      for (let i = 0; i < NAME_PAIRS; i++) {
        if (output.includes(`alpha${i}.dup${i}`)) mentioned++;
      }
      expect(mentioned).to.be.below(7);
    });

    it('build --verbose: lists every output-name collision', () => {
      const { status, output } = runCli([
        'build',
        '-c',
        `${fixtureDir}/name-config.json`,
        '--verbose',
      ]);
      expect(output).to.not.include('unknown option');
      expect(status).to.equal(0);
      for (let i = 0; i < NAME_PAIRS; i++) {
        // both colliding token paths for every colliding output name
        expect(output).to.include(`alpha${i}.dup${i}`);
        expect(output).to.include(`beta${i}.dup${i}`);
      }
      expect(output.length).to.be.above(1000);
    });
  });

  describe('filtered output references', () => {
    it('build: by default filtered references are a concise bounded summary', () => {
      const { status, output } = runCli(['build', '-c', `${fixtureDir}/filtered-config.js`]);
      expect(status).to.equal(0);
      expect(output).to.include('filtered-references.css');
      expect(output).to.match(/reference/i);
      // 25 filtered-out references exist; the default warning stays bounded
      expect(output.length).to.be.below(800);
      let mentioned = 0;
      for (let i = 0; i < FILTERED_PAIRS; i++) {
        const id = String(i).padStart(2, '0');
        if (output.includes(`color.palette.surfaces.base${id}`)) mentioned++;
      }
      expect(mentioned).to.be.below(13);
    });

    it('build --verbose: lists every filtered-out reference', () => {
      const { status, output } = runCli([
        'build',
        '-c',
        `${fixtureDir}/filtered-config.js`,
        '--verbose',
      ]);
      expect(output).to.not.include('unknown option');
      expect(status).to.equal(0);
      for (let i = 0; i < FILTERED_PAIRS; i++) {
        const id = String(i).padStart(2, '0');
        expect(output).to.include(`color.palette.surfaces.base${id}`);
      }
      expect(output.length).to.be.above(800);
    });
  });
});
