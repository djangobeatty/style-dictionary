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

class GroupMessages {
  constructor() {
    /** @type {{[key: string]: string[]}} */
    this.groupedMessages = {};
    /**
     * Extra, verbose-only context for a message, keyed by the message itself.
     * e.g. the reference chain and source files of a reference error.
     * @type {{[key: string]: {[message: string]: string}}}
     */
    this.groupedMessageDetails = {};
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
   * @param {string} messageGroup
   * @param {string} message
   * @param {string} [detail] - verbose-only context for this message
   */
  add(messageGroup, message, detail) {
    if (messageGroup) {
      if (!this.groupedMessages[messageGroup]) {
        this.groupedMessages[messageGroup] = [];
      }
      if (this.groupedMessages[messageGroup].indexOf(message) === -1) {
        this.groupedMessages[messageGroup].push(message);
      }
      if (detail !== undefined) {
        if (!this.groupedMessageDetails[messageGroup]) {
          this.groupedMessageDetails[messageGroup] = {};
        }
        this.groupedMessageDetails[messageGroup][message] = detail;
      }
    }
  }

  /**
   * Fetch the verbose-only detail that was added along with a message.
   * @param {string} messageGroup
   * @param {string} message
   * @returns {string|undefined}
   */
  fetchDetail(messageGroup, message) {
    return this.groupedMessageDetails[messageGroup]?.[message];
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
    messageGroup && this.groupedMessages[messageGroup] && delete this.groupedMessages[messageGroup];
    messageGroup &&
      this.groupedMessageDetails[messageGroup] &&
      delete this.groupedMessageDetails[messageGroup];
  }
}

export default new GroupMessages();
