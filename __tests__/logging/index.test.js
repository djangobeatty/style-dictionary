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
import {
  asLogConfig,
  composeMessage,
  defaultLogConfig,
  inFile,
  logInfo,
  logWarning,
  mergeLogConfigs,
  verbosityHint,
} from '../../lib/logging/index.js';

describe('logging', () => {
  let stub;
  beforeEach(() => {
    stub = stubMethod(console, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('asLogConfig', () => {
    it('should default to an empty config', () => {
      expect(asLogConfig()).to.eql({});
      expect(asLogConfig({})).to.eql({});
    });

    it('should treat a string as the warnings level, which is the old notation', () => {
      expect(asLogConfig('error')).to.eql({ warnings: 'error' });
      expect(asLogConfig('warn')).to.eql({ warnings: 'warn' });
    });

    it('should leave out properties that are not set, so they can be inherited', () => {
      expect(asLogConfig({ warnings: undefined, verbosity: 'verbose' })).to.eql({
        verbosity: 'verbose',
      });
    });
  });

  describe('mergeLogConfigs', () => {
    it('should always return a fully resolved config', () => {
      expect(mergeLogConfigs()).to.eql(defaultLogConfig);
      expect(mergeLogConfigs(undefined, {})).to.eql(defaultLogConfig);
    });

    it('should let the last config win per property', () => {
      expect(
        mergeLogConfigs({ warnings: 'error', verbosity: 'verbose' }, { warnings: 'warn' }),
      ).to.eql({
        warnings: 'warn',
        verbosity: 'verbose',
      });
    });

    it('should inherit properties that a more specific config does not set', () => {
      expect(mergeLogConfigs({ verbosity: 'silent' }, 'error')).to.eql({
        warnings: 'error',
        verbosity: 'silent',
      });
    });
  });

  describe('composeMessage', () => {
    const details = ['first', 'second'];

    it('should summarize and point to the verbose option by default', () => {
      expect(composeMessage('2 things happened:', details, mergeLogConfigs())).to.equal(
        `2 things happened:\n${verbosityHint}`,
      );
    });

    it('should list every detail when verbose', () => {
      expect(
        composeMessage('2 things happened:', details, mergeLogConfigs({ verbosity: 'verbose' })),
      ).to.equal('2 things happened:\n\nfirst\nsecond');
    });

    it('should still summarize when silent, since silence is handled when logging', () => {
      expect(
        composeMessage('2 things happened:', details, mergeLogConfigs({ verbosity: 'silent' })),
      ).to.equal(`2 things happened:\n${verbosityHint}`);
    });
  });

  describe('inFile', () => {
    it('should not mention a file for tokens that were defined inline', () => {
      expect(inFile()).to.equal('');
    });

    it('should mention the file a token was defined in', () => {
      expect(inFile('tokens/color.json')).to.equal(' (tokens/color.json)');
    });
  });

  describe('logWarning', () => {
    it('should log by default', () => {
      logWarning('watch out', mergeLogConfigs());
      expect(stub.callCount).to.equal(1);
      expect(stub.firstCall.args[0]).to.include('watch out');
    });

    it('should throw when warnings are errors', () => {
      expect(() => logWarning('watch out', mergeLogConfigs({ warnings: 'error' }))).to.throw(
        'watch out',
      );
      expect(stub.called).to.be.false;
    });

    it('should stay quiet when warnings are disabled', () => {
      logWarning('watch out', mergeLogConfigs({ warnings: 'disabled' }));
      expect(stub.called).to.be.false;
    });

    it('should stay quiet when silent', () => {
      logWarning('watch out', mergeLogConfigs({ verbosity: 'silent' }));
      expect(stub.called).to.be.false;
    });

    it('should still throw when silent, because errors are not logs', () => {
      expect(() =>
        logWarning('watch out', mergeLogConfigs({ warnings: 'error', verbosity: 'silent' })),
      ).to.throw('watch out');
    });
  });

  describe('logInfo', () => {
    it('should log by default', () => {
      logInfo('created a file', mergeLogConfigs());
      expect(stub.calledWith('created a file')).to.be.true;
    });

    it('should log when warnings are disabled, since it is not a warning', () => {
      logInfo('created a file', mergeLogConfigs({ warnings: 'disabled' }));
      expect(stub.calledWith('created a file')).to.be.true;
    });

    it('should stay quiet when silent', () => {
      logInfo('created a file', mergeLogConfigs({ verbosity: 'silent' }));
      expect(stub.called).to.be.false;
    });
  });
});
