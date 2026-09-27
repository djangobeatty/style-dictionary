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
import { expect } from 'chai';
import { restore, stubMethod } from 'hanbi';
import StyleDictionary from 'style-dictionary';
import { cleanConsoleOutput } from '../_constants.js';

/**
 * Property reference errors are collected while resolving references and
 * thrown from the build. By default the thrown message must stay concise:
 * however many broken references exist, the message stays bounded and does
 * not enumerate every single occurrence. Expanding every reference error
 * (with reference chain and source file) is what --verbose is for; that side
 * is covered in __node_tests__/cliVerbose.test.js.
 */
describe('integration', () => {
  let stubLog;
  let stubWarn;
  let stubError;

  const collectOutput = () =>
    cleanConsoleOutput(
      [stubLog, stubWarn, stubError]
        .flatMap((stub) => Array.from(stub.calls))
        .flatMap((call) => call.args.map((arg) => (typeof arg === 'string' ? arg : String(arg))))
        .join('\n'),
    );

  beforeEach(() => {
    stubLog = stubMethod(console, 'log');
    stubWarn = stubMethod(console, 'warn');
    stubError = stubMethod(console, 'error');
  });

  afterEach(() => {
    restore();
  });

  /**
   * Tokens where every color.brokenN holds a reference to a token
   * (color.missingN) that is not defined anywhere.
   */
  function brokenReferenceTokens(count) {
    const tokens = { color: {} };
    for (let i = 0; i < count; i++) {
      tokens.color[`broken${i}`] = { value: `{color.missing${i}.value}` };
    }
    return tokens;
  }

  async function buildAndGetError(count) {
    const sd = new StyleDictionary({
      tokens: brokenReferenceTokens(count),
      platforms: { css: {} },
    });
    try {
      await sd.buildAllPlatforms();
    } catch (err) {
      return err;
    }
    return null;
  }

  function countMentionedIndices(text, count) {
    let mentioned = 0;
    for (let i = 0; i < count; i++) {
      if (text.includes(`color.broken${i}.value`) || text.includes(`color.missing${i}.value`)) {
        mentioned++;
      }
    }
    return mentioned;
  }

  describe('logging > property reference errors', () => {
    it('fails with a concise, bounded message that does not enumerate every reference error', async () => {
      const error = await buildAndGetError(40);
      expect(error).to.be.an('error');
      expect(error.message).to.match(/reference/i);

      // with 40 broken references the thrown message must stay bounded...
      expect(error.message.length).to.be.below(2400);
      // ...and must not spell out every single broken reference
      expect(countMentionedIndices(error.message, 40)).to.be.below(20);

      // console output must not flood either: at most a partial glimpse
      expect(countMentionedIndices(collectOutput(), 40)).to.be.below(20);
    });

    it('keeps the message size bounded as the number of broken references grows', async () => {
      const few = await buildAndGetError(3);
      const many = await buildAndGetError(40);
      expect(few).to.be.an('error');
      expect(many).to.be.an('error');

      // going from 3 to 40 broken references may add a count, not 37 messages
      expect(many.message.length).to.be.below(few.message.length + 2500);
      expect(many.message.length).to.be.below(2400);
      expect(countMentionedIndices(many.message, 40)).to.be.below(20);
    });
  });
});
