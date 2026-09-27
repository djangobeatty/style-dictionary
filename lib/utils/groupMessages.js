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

import { boundMessages } from './log.js';

class GroupMessages {
  constructor() {
    /** @type {{[key: string]: string[]}} */
    this.groupedMessages = {};
    /**
     * Verbose variant of a message, keyed by the message it expands on.
     * @type {{[key: string]: {[message: string]: string}}}
     */
    this.groupedVerboseMessages = {};
    this.GROUP = {
      PropertyReferenceWarnings: 'Property Reference Errors',
      PropertyValueCollisions: 'Property Value Collisions',
      TemplateDeprecationWarnings: 'Template Deprecation Warnings',
      RegisterTemplateDeprecationWarnings: 'Register Template Deprecation Warnings',
      SassMapFormatDeprecationWarnings: 'Sass Map Format Deprecation Warnings',
      MissingRegisterTransformErrors: 'Missing Register Transform Errors',
      PropertyNameCollisionWarnings: 'Property Name Collision Warnings',
      FilteredOutputReferences: 'Filtered Output Reference Warnings',
    };
  }

  /**
   *
   * @param {string} messageGroup
   * @returns {string[]}
   */
  flush(messageGroup) {
    const messages = this.fetchMessages(messageGroup);
    this.clear(messageGroup);
    return messages;
  }

  /**
   * Flushes a group and returns a bounded report. Without verbose only the
   * first `limit` messages are returned, so the output stays bounded no matter
   * how many messages were collected. In verbose mode every message is
   * returned, using the verbose variant of a message when one was registered.
   *
   * @param {string} messageGroup
   * @param {{ verbose?: boolean, limit?: number }} [opts]
   * @returns {import('./log.js').BoundedMessages}
   */
  report(messageGroup, opts = {}) {
    const verboseMessages = this.groupedVerboseMessages[messageGroup] ?? {};
    const messages = this.flush(messageGroup).map((message) =>
      opts.verbose ? verboseMessages[message] ?? message : message,
    );
    return boundMessages(messages, opts);
  }

  /**
   * @param {string} messageGroup
   * @param {string} message
   * @param {string} [verboseMessage] - expansion of `message`, shown with --verbose
   */
  add(messageGroup, message, verboseMessage) {
    if (messageGroup) {
      if (!this.groupedMessages[messageGroup]) {
        this.groupedMessages[messageGroup] = [];
      }
      if (this.groupedMessages[messageGroup].indexOf(message) === -1) {
        this.groupedMessages[messageGroup].push(message);
        if (verboseMessage !== undefined) {
          if (!this.groupedVerboseMessages[messageGroup]) {
            this.groupedVerboseMessages[messageGroup] = {};
          }
          this.groupedVerboseMessages[messageGroup][message] = verboseMessage;
        }
      }
    }
  }

  /**
   *
   * @param {string} messageGroup
   * @returns {number}
   */
  count(messageGroup) {
    return this.groupedMessages[messageGroup] ? this.groupedMessages[messageGroup].length : 0;
  }

  /**
   *
   * @param {string} messageGroup
   * @returns {string[]}
   */
  fetchMessages(messageGroup) {
    return (messageGroup && this.groupedMessages[messageGroup]) || [];
  }

  /**
   * @param {string} messageGroup
   */
  clear(messageGroup) {
    if (messageGroup) {
      delete this.groupedMessages[messageGroup];
      delete this.groupedVerboseMessages[messageGroup];
    }
  }
}

export default new GroupMessages();
