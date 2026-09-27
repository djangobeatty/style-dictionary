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
 * @typedef {Object} BoundedMessages
 * @property {string[]} messages - the messages that should be shown
 * @property {number} total - the total amount of messages that were collected
 * @property {number} omitted - the amount of messages that were left out
 */

/**
 * Keeps a list of collected messages bounded by default. When verbose, every
 * message is returned; otherwise only the first `limit` messages are returned,
 * so that the size of the output stays the same no matter how many problems a
 * build ran into.
 *
 * @param {string[]} messages
 * @param {{ verbose?: boolean, limit?: number }} [opts]
 * @returns {BoundedMessages}
 */
export function boundMessages(messages, { verbose = false, limit = 5 } = {}) {
  const total = messages.length;
  if (verbose || total <= limit) {
    return { messages, total, omitted: 0 };
  }
  return { messages: messages.slice(0, limit), total, omitted: total - limit };
}

/**
 * Formats the tail of a bounded report, e.g. "...and 35 more (40 total).".
 * Returns an empty string when nothing was left out.
 *
 * @param {BoundedMessages} report
 * @param {string} [indent] - indentation applied to the summary line
 * @returns {string}
 */
export function omittedMessages({ total, omitted }, indent = '') {
  if (!omitted) {
    return '';
  }
  return `${indent}...and ${omitted} more (${total} total). Run with --verbose to see all of them.`;
}

/**
 * console.log wrapper that respects the `silent` logging option.
 *
 * @param {string} message
 * @param {{ silent?: boolean }} [opts]
 */
export function log(message, { silent = false } = {}) {
  if (!silent) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

/**
 * console.warn wrapper that respects the `silent` logging option.
 *
 * @param {string} message
 * @param {{ silent?: boolean }} [opts]
 */
export function warn(message, { silent = false } = {}) {
  if (!silent) {
    // eslint-disable-next-line no-console
    console.warn(message);
  }
}
