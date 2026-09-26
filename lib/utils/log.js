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
 * @typedef {import('../../types/Config.d.ts').LogConfig} LogConfig
 * @typedef {import('../../types/Config.d.ts').LogVerbosity} LogVerbosity
 * @typedef {import('../../types/Config.d.ts').LogWarningLevel} LogWarningLevel
 * @typedef {import('../../types/Config.d.ts').ResolvedLogConfig} ResolvedLogConfig
 */

/**
 * Verbosity of the logging. `silent` suppresses all output, `verbose` shows
 * the full detail of every warning, `default` shows concise summaries.
 * @type {{default: LogVerbosity, silent: LogVerbosity, verbose: LogVerbosity}}
 */
export const logVerbosityLevels = {
  default: 'default',
  silent: 'silent',
  verbose: 'verbose',
};

/**
 * How warnings are handled. `warn` logs them, `error` throws them and
 * `disabled` ignores them entirely.
 * @type {{warn: LogWarningLevel, error: LogWarningLevel, disabled: LogWarningLevel}}
 */
export const logWarningLevels = {
  warn: 'warn',
  error: 'error',
  disabled: 'disabled',
};

/**
 * Extracts only the fields that are explicitly set on a `log` option,
 * so they can be merged onto another (already resolved) config.
 *
 * For backwards compatibility a plain string is still accepted, where
 * `'warn' | 'error' | 'disabled'` sets the warning level and
 * `'default' | 'silent' | 'verbose'` sets the verbosity.
 *
 * @param {LogConfig|LogWarningLevel|LogVerbosity|undefined} log
 * @returns {LogConfig}
 */
function getExplicitLogConfig(log) {
  /** @type {LogConfig} */
  const config = {};

  if (typeof log === 'string') {
    if (Object.values(logVerbosityLevels).includes(/** @type {LogVerbosity} */ (log))) {
      config.verbosity = /** @type {LogVerbosity} */ (log);
    } else {
      config.warnings = /** @type {LogWarningLevel} */ (log);
    }
  } else if (log && typeof log === 'object') {
    if (log.warnings) {
      config.warnings = log.warnings;
    }
    if (log.verbosity) {
      config.verbosity = log.verbosity;
    }
  }

  return config;
}

/**
 * Normalizes the `log` option into a fully resolved config, filling in defaults.
 * @param {LogConfig|LogWarningLevel|LogVerbosity|undefined} log
 * @returns {ResolvedLogConfig}
 */
export function resolveLogConfig(log) {
  return {
    warnings: logWarningLevels.warn,
    verbosity: logVerbosityLevels.default,
    ...getExplicitLogConfig(log),
  };
}

/**
 * Resolves a `log` config that inherits from a base one (e.g. a platform
 * inheriting the global config, or the CLI flags on top of the config file),
 * where only the fields explicitly set on the override win.
 *
 * @param {LogConfig|LogWarningLevel|LogVerbosity|undefined} base
 * @param {LogConfig|LogWarningLevel|LogVerbosity|undefined} override
 * @returns {ResolvedLogConfig}
 */
export function mergeLogConfig(base, override) {
  return {
    ...resolveLogConfig(base),
    ...getExplicitLogConfig(override),
  };
}

/**
 * Logs one or more messages to the console, unless the verbosity is `silent`.
 * @param {LogVerbosity} verbosity
 * @param {string|string[]} messages
 */
export function log(verbosity, messages) {
  if (verbosity === logVerbosityLevels.silent) {
    return;
  }

  const message = Array.isArray(messages) ? messages.join('\n') : messages;
  // eslint-disable-next-line no-console
  console.log(message);
}

/**
 * Handles a warning depending on the configured warning level:
 * - `disabled`: nothing is logged and nothing is thrown
 * - `error`: throws an `Error` with the full (verbose) messages
 * - `warn`: logs the concise messages by default, the full messages when verbose
 *
 * @param {ResolvedLogConfig} logConfig
 * @param {string|string[]} messages - the full/verbose messages
 * @param {{concise?: string|string[]}} [opts]
 */
export function logWarning(logConfig, messages, opts = {}) {
  const { warnings, verbosity } = logConfig;

  if (warnings === logWarningLevels.disabled) {
    return;
  }

  const full = Array.isArray(messages) ? messages.join('\n') : messages;

  // Errors are always thrown with the full detail, so the user can act on them
  if (warnings === logWarningLevels.error) {
    throw new Error(full);
  }

  if (verbosity === logVerbosityLevels.verbose) {
    log(verbosity, full);
    return;
  }

  const concise = opts.concise ?? full;
  log(verbosity, concise);
}
