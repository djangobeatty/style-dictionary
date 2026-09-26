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

import JSON5 from 'json5';
import { extname } from 'path-unified';
import { fs } from 'style-dictionary/fs';
import { resolve } from '../resolve.js';

/**
 * @typedef {import('../../types/Config.d.ts').Config} Config
 */

/**
 * Loads a Style Dictionary config from a file path. Supports JSON, JSON5 and
 * JSONC files as well as JavaScript modules.
 *
 * JSON files are parsed synchronously and returned directly, so that
 * `new StyleDictionary('config.json')` has its options populated before the
 * constructor returns. JavaScript modules are imported asynchronously and
 * returned as a promise.
 *
 * @param {string} configPath
 * @returns {Config|Promise<Config>}
 */
export default function loadConfig(configPath) {
  // get ext name without leading .
  const ext = extname(configPath).replace(/^\./, '');
  // import path in Node has to be relative to cwd, in browser to root
  const cfgFilePath = resolve(configPath);

  if (['json', 'json5', 'jsonc'].includes(ext)) {
    return JSON5.parse(/** @type {string} */ (fs.readFileSync(cfgFilePath, 'utf-8')));
  }

  let _filePath = cfgFilePath;
  if (typeof window !== 'object' && process?.platform === 'win32') {
    // Windows FS compatibility. If in browser, we use an FS shim which doesn't require this Windows workaround
    _filePath = new URL(`file:///${_filePath}`).href;
  }
  return import(/* webpackIgnore: true */ _filePath).then((module) => module.default);
}
