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
 * @typedef {import('../../types/Config.d.ts').LogWarningLevels} LogWarningLevels
 * @typedef {import('../../types/Config.d.ts').LogVerbosityLevels} LogVerbosityLevels
 * @typedef {Required<LogConfig>} ResolvedLogConfig
 */

/** @type {ResolvedLogConfig} */
export const defaultLogConfig = {
  warnings: 'warn',
  verbosity: 'default',
};

/**
 * Hint that is appended to summarised warnings so users know how to see the details.
 */
export const verbosityHint = `Use log.verbosity "verbose" or use the CLI --verbose option to see the full report.`;

/**
 * Normalizes the `log` option into a complete log config.
 * The `log` option can also be given as a string, which is
 * shorthand for the warnings level.
 * @param {LogConfig|LogWarningLevels|undefined} log
 * @param {ResolvedLogConfig} [base] config to fall back on for unspecified levels
 * @returns {ResolvedLogConfig}
 */
export function normalizeLogConfig(log, base = defaultLogConfig) {
  if (typeof log === 'string') {
    return { ...base, warnings: log };
  }
  return { ...base, ...(log ?? {}) };
}

/**
 * Counts occurrences in a grammatically correct way, e.g. "1 collision", "3 collisions".
 * @param {number} count
 * @param {string} noun singular form of what is being counted
 * @returns {string}
 */
export function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Reports a warning: throws it when warnings are configured as errors,
 * logs it unless logging is silenced.
 * @param {string} message
 * @param {ResolvedLogConfig} log
 */
export function reportWarning(message, log) {
  if (log.warnings === 'error') {
    throw new Error(message);
  }
  if (log.verbosity !== 'silent') {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}
