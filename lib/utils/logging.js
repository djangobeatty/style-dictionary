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
 * @typedef {import('../../types/Config.d.ts').Verbosity} Verbosity
 */

export const defaultVerbosity = 'default';

/**
 * Whether anything may be logged at all. Silent means no logs at all,
 * errors are still thrown when they occur.
 * @param {Verbosity} [verbosity]
 * @returns {boolean}
 */
export function shouldLog(verbosity) {
  return (verbosity ?? defaultVerbosity) !== 'silent';
}

/**
 * Whether every individual warning/error message should be shown,
 * as opposed to just a concise summary message.
 * @param {Verbosity} [verbosity]
 * @returns {boolean}
 */
export function isVerbose(verbosity) {
  return (verbosity ?? defaultVerbosity) === 'verbose';
}

/**
 * Appended to concise summary messages to point users at the verbose output,
 * which shows every individual collision or reference error.
 * @returns {string}
 */
export function verboseHint() {
  return 'Re-run with verbosity "verbose" (e.g. --verbose when using the CLI) to see details.';
}

/**
 * Formats a group of messages either in full (verbose) or as a concise
 * summary message that only shows the number of messages found.
 * @param {string[]} messages
 * @param {string} noun e.g. 'reference error', used to compose the summary message
 * @param {Verbosity} [verbosity]
 * @returns {string}
 */
export function formatMessages(messages, noun, verbosity) {
  if (isVerbose(verbosity)) {
    return messages.join('\n');
  }
  return `${messages.length} ${noun}${messages.length === 1 ? '' : 's'} found. ${verboseHint()}`;
}
