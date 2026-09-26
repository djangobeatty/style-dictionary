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
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const binPath = fileURLToPath(new URL('../bin/style-dictionary.js', import.meta.url));

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-collisions-'));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2),
    );
  }
  return dir;
}

function runCli(dir, args) {
  const result = childProcess.spawnSync(process.execPath, [binPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/**
 * Returns the first number occurring within maxGap characters of the label,
 * or null. Used to verify that a concise warning groups its occurrences under
 * a label that carries a count.
 */
function nearbyNumber(text, label, maxGap = 120) {
  const idx = text.indexOf(label);
  if (idx < 0) return null;
  const window = text.slice(Math.max(0, idx - maxGap), idx + label.length + maxGap);
  const match = window.match(/\d+/);
  return match ? match[0] : null;
}

describe('collision warnings verbosity', function () {
  this.timeout(60000);

  let valueDir;
  let nameDir;

  before(() => {
    // both source files define the same token: value, type, filePath and
    // isSource all collide, so the default output must not enumerate them
    valueDir = makeProject({
      'config.json': {
        source: ['tokens/one.json', 'tokens/two.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [{ destination: 'out.css', format: 'css/variables' }],
          },
        },
      },
      'tokens/one.json': { size: { padding: { small: { value: '8px', type: 'dimension' } } } },
      'tokens/two.json': { size: { padding: { small: { value: '4px', type: 'dimension' } } } },
    });
    // three tokens with different paths share the same generated output name
    nameDir = makeProject({
      'config.json': {
        source: ['tokens/names.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [{ destination: 'names.css', format: 'css/variables' }],
          },
        },
      },
      'tokens/names.json': {
        color: {
          background: { primary: { value: '#111111' } },
          border: { primary: { value: '#222222' } },
          brand: { primary: { value: '#333333' } },
        },
      },
    });
  });

  after(() => {
    fs.rmSync(valueDir, { recursive: true, force: true });
    fs.rmSync(nameDir, { recursive: true, force: true });
  });

  it('groups value collisions by token with a count and a --verbose pointer by default', () => {
    const res = runCli(valueDir, ['build']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `expected a pointer to --verbose, output:\n${res.output}`).to.match(
      /--verbose/,
    );
    expect(res.output, `expected grouping by token path:\n${res.output}`).to.match(
      /size\.padding\.small/,
    );
    expect(
      nearbyNumber(res.output, 'size.padding.small'),
      `expected a count near the colliding token path, output:\n${res.output}`,
    ).to.not.be.null;
    // every occurrence (values and source file names) must be omitted by default
    expect(res.output, `expected no occurrence details:\n${res.output}`).to.not.match(/8px/);
    expect(res.output).to.not.match(/4px/);
    expect(res.output).to.not.match(/one\.json/);
    expect(res.output).to.not.match(/two\.json/);
  });

  it('lists every value collision occurrence with --verbose', () => {
    const res = runCli(valueDir, ['build', '--verbose']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `expected every occurrence listed, output:\n${res.output}`).to.match(/8px/);
    expect(res.output).to.match(/4px/);
  });

  it('groups output name collisions by output name with a count and a --verbose pointer by default', () => {
    const res = runCli(nameDir, ['build']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `expected a pointer to --verbose, output:\n${res.output}`).to.match(
      /--verbose/,
    );
    expect(res.output, `expected grouping by output name:\n${res.output}`).to.match(/primary/);
    expect(
      nearbyNumber(res.output, 'primary'),
      `expected a count near the output name, output:\n${res.output}`,
    ).to.not.be.null;
    // every colliding token must be omitted by default
    expect(res.output, `expected no occurrence details:\n${res.output}`).to.not.match(
      /color\.border\.primary/,
    );
    expect(res.output).to.not.match(/#222222/);
  });

  it('lists every output name collision occurrence with --verbose', () => {
    const res = runCli(nameDir, ['build', '--verbose']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `expected every occurrence listed:\n${res.output}`).to.match(
      /color\.background\.primary/,
    );
    expect(res.output).to.match(/color\.border\.primary/);
    expect(res.output).to.match(/color\.brand\.primary/);
  });
});
