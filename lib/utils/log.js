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

/**
 * @typedef {import('../../types/Config.d.ts').LogOptions} LogOptions
 */

/**
 * Shared logging layer for Style Dictionary.
 *
 * Every console message produced by the build and clean phases goes through
 * here so that verbosity can be controlled from a single place:
 * - default: concise messages, warnings are grouped with a count and a pointer
 *   to `--verbose`
 * - verbose: every individual warning/error is expanded with full detail
 * - silent: no console output at all
 *
 * Thrown build failures are never suppressed, they surface through the normal
 * error channel regardless of verbosity.
 */

/* eslint-disable no-control-regex */
const ANSI_REGEX = new RegExp(
  '[\\u001b\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]',
  'g',
);
/* eslint-enable no-control-regex */

/**
 * Whether console output should be suppressed entirely.
 * @param {LogOptions} [opts]
 * @returns {boolean}
 */
export function isSilent(opts) {
  return !!opts?.silent;
}

/**
 * Whether messages should be expanded with full detail.
 * `--silent` always wins over `--verbose`.
 * @param {LogOptions} [opts]
 * @returns {boolean}
 */
export function isVerbose(opts) {
  return !!opts?.verbose && !isSilent(opts);
}

/**
 * Print a routine message, unless output is silenced.
 * @param {LogOptions} [opts]
 * @param {...any} args
 */
export function log(opts, ...args) {
  if (isSilent(opts)) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * Strip ANSI escape codes, useful when messages need to be parsed or
 * re-rendered in a different shape.
 * @param {string} str
 * @returns {string}
 */
export function stripAnsi(str) {
  return typeof str === 'string' ? str.replace(ANSI_REGEX, '') : str;
}
