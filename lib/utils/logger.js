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
 * Centralized console logging for Style Dictionary.
 *
 * Verbosity is configured once per build from the `verbose` and `silent`
 * config options, or from the equivalent `--verbose` / `--silent` CLI flags:
 *
 * - default: concise messages, no per-token detail, to avoid flooding the console
 * - verbose: full detail for every warning/error, useful for debugging
 * - silent: no console output at all
 *
 * @typedef {{ verbose?: boolean, silent?: boolean }} LoggingOptions
 */

/** @type {{ verbose: boolean, silent: boolean }} */
const state = { verbose: false, silent: false };

/**
 * Configure the global logging verbosity.
 * @param {LoggingOptions} [opts]
 */
export function setLoggingOptions({ verbose = false, silent = false } = {}) {
  state.verbose = verbose === true;
  state.silent = silent === true;
}

/** @returns {boolean} whether verbose logging (full warning/error detail) is enabled */
export function isVerbose() {
  return state.verbose;
}

/** @returns {boolean} whether all console output is suppressed */
export function isSilent() {
  return state.silent;
}

/**
 * Log a regular message to the console, unless silent.
 * @param {...any} args
 */
export function log(...args) {
  if (state.silent) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * Log a warning to the console, unless silent.
 * @param {...any} args
 */
export function warn(...args) {
  if (state.silent) {
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(...args);
}

/**
 * Log an error to the console, unless silent.
 * @param {...any} args
 */
export function error(...args) {
  if (state.silent) {
    return;
  }
  // eslint-disable-next-line no-console
  console.error(...args);
}
