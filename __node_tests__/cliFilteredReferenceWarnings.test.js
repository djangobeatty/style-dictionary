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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-filtered-refs-'));
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

function nearbyNumber(text, label, maxGap = 120) {
  const idx = text.indexOf(label);
  if (idx < 0) return null;
  const window = text.slice(Math.max(0, idx - maxGap), idx + label.length + maxGap);
  const match = window.match(/\d+/);
  return match ? match[0] : null;
}

describe('filtered outputReferences warnings verbosity', function () {
  this.timeout(60000);

  let projectDir;

  before(() => {
    // three kept tokens reference three tokens that the filter excludes, so
    // building with outputReferences reports three filtered-out references
    projectDir = makeProject({
      'config.json': {
        source: ['tokens/refs.json'],
        platforms: {
          css: {
            buildPath: 'build/',
            files: [
              {
                destination: 'filtered.css',
                format: 'css/variables',
                options: { outputReferences: true },
                filter: { type: 'kept' },
              },
            ],
          },
        },
      },
      'tokens/refs.json': {
        color: {
          base: { value: '#111111', type: 'hidden' },
          fg: { value: '#222222', type: 'hidden' },
          accent: { value: '#333333', type: 'hidden' },
          border: { value: '1px solid {color.base}', type: 'kept' },
          text: { value: '{color.fg}', type: 'kept' },
          link: { value: '{color.accent}', type: 'kept' },
        },
      },
    });
  });

  after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('reports a concise count with a --verbose pointer by default', () => {
    const res = runCli(projectDir, ['build']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `expected a pointer to --verbose, output:\n${res.output}`).to.match(
      /--verbose/,
    );
    expect(res.output, `expected grouping by output file:\n${res.output}`).to.match(
      /filtered\.css/,
    );
    expect(
      nearbyNumber(res.output, 'filtered.css'),
      `expected a count near the output file name, output:\n${res.output}`,
    ).to.not.be.null;
    // the individual filtered-out references must not be listed by default
    expect(res.output, `expected no individual references:\n${res.output}`).to.not.match(
      /color\.base/,
    );
    expect(res.output).to.not.match(/color\.fg/);
    expect(res.output).to.not.match(/color\.accent/);
  });

  it('lists every filtered-out reference with --verbose', () => {
    const res = runCli(projectDir, ['build', '--verbose']);
    expect(res.status, `expected a successful build, output:\n${res.output}`).to.equal(0);
    expect(res.output, `every filtered reference listed, output:\n${res.output}`).to.match(
      /color\.base/,
    );
    expect(res.output).to.match(/color\.fg/);
    expect(res.output).to.match(/color\.accent/);
  });
});
