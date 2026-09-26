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

import chalk from 'chalk';

/**
 * @typedef {import('../../types/LogConfig.d.ts').LogConfig} LogConfig
 * @typedef {import('../../types/LogConfig.d.ts').LogConfigShorthand} LogConfigShorthand
 * @typedef {import('../../types/LogConfig.d.ts').ResolvedLogConfig} ResolvedLogConfig
 */

/** @type {ResolvedLogConfig} */
export const defaultLogConfig = {
  warnings: 'warn',
  verbosity: 'default',
};

/**
 * Appended to every summarized message so users know how to get the full story.
 */
export const verbosityHint =
  'Use log.verbosity "verbose" or CLI option --verbose for more details.';

/**
 * Accepts both the object notation and the `'warn'|'error'` shorthand and
 * always returns a (partial) log config object without unset properties,
 * so that merging it never wipes out a less specific config.
 * @param {LogConfig|LogConfigShorthand} [log]
 * @returns {LogConfig}
 */
export function asLogConfig(log) {
  if (typeof log === 'string') {
    return { warnings: log };
  }
  /** @type {LogConfig} */
  const to_ret = {};
  if (log?.warnings !== undefined) to_ret.warnings = log.warnings;
  if (log?.verbosity !== undefined) to_ret.verbosity = log.verbosity;
  return to_ret;
}

/**
 * Merges log configs from least to most specific, e.g. defaults < config < platform < CLI.
 * Properties that aren't set by a more specific config are inherited.
 * @param {...(LogConfig|LogConfigShorthand|undefined)} logs
 * @returns {ResolvedLogConfig}
 */
export function mergeLogConfigs(...logs) {
  let merged = { ...defaultLogConfig };
  for (const log of logs) {
    merged = { ...merged, ...asLogConfig(log) };
  }
  return merged;
}

/**
 * Composes a message that only lists all of its details when the user asked
 * for verbose logging, so that e.g. hundreds of collisions don't flood the console.
 * @param {string} summary - a concise description, always shown
 * @param {string[]} details - the individual messages, only shown when verbose
 * @param {ResolvedLogConfig} log
 * @returns {string}
 */
export function composeMessage(summary, details, log) {
  if (log.verbosity === 'verbose') {
    return `${summary}\n\n${details.join('\n')}`;
  }
  return `${summary}\n${verbosityHint}`;
}

/**
 * Formats the token file a message is about, if we know it. Tokens that were
 * defined inline don't have one.
 * @param {string} [filePath]
 * @returns {string}
 */
export function inFile(filePath) {
  return filePath ? ` (${filePath})` : '';
}

/**
 * Reports a warning, taking the log config into account:
 * throws when warnings are set to `error`, stays quiet when they are `disabled`
 * or when verbosity is `silent`, and logs to the console otherwise.
 * @param {string} message
 * @param {ResolvedLogConfig} log
 */
export function logWarning(message, log) {
  if (log.warnings === 'error') {
    throw new Error(message);
  }
  if (log.warnings === 'disabled' || log.verbosity === 'silent') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(chalk.rgb(255, 140, 0).bold(message));
}

/**
 * Reports informational output such as created or removed files,
 * which is shown unless the user asked for silence.
 * @param {string} message
 * @param {ResolvedLogConfig} log
 */
export function logInfo(message, log) {
  if (log.verbosity === 'silent') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(message);
}
