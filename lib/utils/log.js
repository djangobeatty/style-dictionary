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
 * @typedef {import('../../types/Config.d.ts').LogVerbosity} LogVerbosity
 */

/** @type {LogVerbosity} */
export const DEFAULT_VERBOSITY = 'default';

/**
 * Resolve the verbosity to use for a log call, falling back to the default
 * when nothing was configured.
 * @param {LogVerbosity} [verbosity]
 * @returns {LogVerbosity}
 */
export function resolveVerbosity(verbosity) {
  return verbosity ?? DEFAULT_VERBOSITY;
}

/**
 * @param {LogVerbosity} [verbosity]
 * @returns {boolean}
 */
export function isSilent(verbosity) {
  return verbosity === 'silent';
}

/**
 * @param {LogVerbosity} [verbosity]
 * @returns {boolean}
 */
export function isVerbose(verbosity) {
  return verbosity === 'verbose';
}

/**
 * Log an informational message, unless logging is silenced.
 * @param {LogVerbosity} verbosity
 * @param {string} message
 */
export function logInfo(verbosity, message) {
  if (isSilent(verbosity)) return;
  // eslint-disable-next-line no-console
  console.log(message);
}

/**
 * Log a warning message, unless logging is silenced.
 * @param {LogVerbosity} verbosity
 * @param {string} message
 */
export function logWarning(verbosity, message) {
  if (isSilent(verbosity)) return;
  // eslint-disable-next-line no-console
  console.log(chalk.rgb(255, 140, 0)(message));
}

/**
 * Format the concise, default-mode summary of a group of problems:
 * the category label followed by the number of occurrences.
 * @param {string} label - the category label, e.g. "Property Value Collisions"
 * @param {number} count - the number of occurrences that were collected
 * @returns {string}
 */
export function formatWarningSummary(label, count) {
  return `${label}: ${count}\nUse --verbose to see the full list of occurrences.`;
}
