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
 * Logging is configured through the `log` option of the config or platform config.
 *
 * ```js
 * {
 *   log: {
 *     warnings: 'warn', // 'warn' | 'error' | 'disabled'
 *     verbosity: 'default', // 'default' | 'silent' | 'verbose'
 *     errors: {
 *       brokenReferences: 'throw', // 'throw' | 'console'
 *     },
 *   },
 * }
 * ```
 *
 * For backwards compatibility the legacy string form is still accepted,
 * `log: 'warn'` and `log: 'error'` are shorthand for setting `log.warnings`.
 *
 * @typedef {import('../../types/Config.d.ts').LogConfig} LogConfig
 */

export const logWarningLevels = {
  warn: 'warn',
  error: 'error',
  disabled: 'disabled',
};

export const logVerbosityLevels = {
  default: 'default',
  silent: 'silent',
  verbose: 'verbose',
};

export const logErrorLevels = {
  console: 'console',
  throw: 'throw',
};

/**
 * Normalize the log config, allowing the legacy string form.
 * @param {LogConfig|'warn'|'error'|undefined} config
 * @returns {LogConfig}
 */
export function normalizeLogConfig(config) {
  if (typeof config === 'string') {
    return { warnings: /** @type {any} */ (config) };
  }
  return config ?? {};
}

/**
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {string}
 */
export function getWarningLevel(config) {
  return normalizeLogConfig(config).warnings ?? logWarningLevels.warn;
}

/**
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {string}
 */
export function getVerbosityLevel(config) {
  return normalizeLogConfig(config).verbosity ?? logVerbosityLevels.default;
}

/**
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {string}
 */
export function getBrokenReferencesLevel(config) {
  return normalizeLogConfig(config).errors?.brokenReferences ?? logErrorLevels.throw;
}

/**
 * Whether nothing at all should be logged.
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {boolean}
 */
export function isSilent(config) {
  return getVerbosityLevel(config) === logVerbosityLevels.silent;
}

/**
 * Whether every detail should be logged.
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {boolean}
 */
export function isVerbose(config) {
  return getVerbosityLevel(config) === logVerbosityLevels.verbose;
}

/**
 * Logs a message to the console, unless the verbosity is set to `silent`.
 * @param {string} msg
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {void}
 */
export function log(msg, config) {
  if (isSilent(config)) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(msg);
}

/**
 * Logs a warning to the console.
 * When `warnings` is set to `error` the warning is thrown as an error instead.
 * When `warnings` is set to `disabled` or the verbosity is `silent` nothing happens.
 * @param {string} msg
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {void}
 */
export function logWarning(msg, config) {
  const warningLevel = getWarningLevel(config);
  if (warningLevel === logWarningLevels.error) {
    throw new Error(msg);
  }
  if (warningLevel === logWarningLevels.disabled) {
    return;
  }
  log(msg, config);
}

/**
 * Logs a message to the console only when the verbosity is set to `verbose`.
 * @param {string} msg
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {void}
 */
export function logVerbose(msg, config) {
  if (!isVerbose(config)) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(msg);
}

/**
 * Handles broken reference errors.
 * By default these are thrown, but `errors.brokenReferences` can be set to
 * `console` to log them instead.
 * @param {string} msg
 * @param {LogConfig|'warn'|'error'|undefined} [config]
 * @returns {void}
 */
export function logError(msg, config) {
  if (getBrokenReferencesLevel(config) === logErrorLevels.throw) {
    throw new Error(msg);
  }
  log(msg, config);
}
