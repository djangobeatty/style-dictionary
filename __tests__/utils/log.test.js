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
  getBrokenReferencesLevel,
  getVerbosityLevel,
  getWarningLevel,
  isSilent,
  isVerbose,
  log,
  logError,
  logVerbose,
  logWarning,
  logErrorLevels,
  logVerbosityLevels,
  logWarningLevels,
  normalizeLogConfig,
} from '../../lib/utils/log.js';

describe('utils', () => {
  describe('log', () => {
    let stub;
    beforeEach(() => {
      stub = stubMethod(console, 'log');
    });
    afterEach(() => {
      restore();
    });

    describe('normalizeLogConfig', () => {
      it('should keep the object config as is', () => {
        const config = { verbosity: 'verbose' };
        expect(normalizeLogConfig(config)).to.equal(config);
      });

      it('should support the legacy string config', () => {
        expect(normalizeLogConfig('error')).to.eql({ warnings: 'error' });
        expect(normalizeLogConfig('warn')).to.eql({ warnings: 'warn' });
      });

      it('should default to an empty config', () => {
        expect(normalizeLogConfig(undefined)).to.eql({});
      });
    });

    describe('level getters', () => {
      it('should have sensible defaults', () => {
        expect(getWarningLevel()).to.equal(logWarningLevels.warn);
        expect(getVerbosityLevel()).to.equal(logVerbosityLevels.default);
        expect(getBrokenReferencesLevel()).to.equal(logErrorLevels.throw);
      });

      it('should read the configured levels', () => {
        expect(getWarningLevel({ warnings: 'disabled' })).to.equal('disabled');
        expect(getVerbosityLevel({ verbosity: 'silent' })).to.equal('silent');
        expect(getBrokenReferencesLevel({ errors: { brokenReferences: 'console' } })).to.equal(
          'console',
        );
      });

      it('isSilent and isVerbose should reflect the verbosity', () => {
        expect(isSilent({ verbosity: 'silent' })).to.be.true;
        expect(isSilent({ verbosity: 'verbose' })).to.be.false;
        expect(isVerbose({ verbosity: 'verbose' })).to.be.true;
        expect(isVerbose({ verbosity: 'silent' })).to.be.false;
      });
    });

    describe('log', () => {
      it('should log by default', () => {
        log('hello');
        expect(stub.firstCall.args).to.eql(['hello']);
      });

      it('should not log when silent', () => {
        log('hello', { verbosity: 'silent' });
        expect(stub.called).to.be.false;
      });
    });

    describe('logVerbose', () => {
      it('should only log when verbose', () => {
        logVerbose('hello');
        expect(stub.called).to.be.false;
        logVerbose('hello', { verbosity: 'verbose' });
        expect(stub.firstCall.args).to.eql(['hello']);
      });
    });

    describe('logWarning', () => {
      it('should log by default', () => {
        logWarning('careful');
        expect(stub.firstCall.args).to.eql(['careful']);
      });

      it('should not log when warnings are disabled', () => {
        logWarning('careful', { warnings: 'disabled' });
        expect(stub.called).to.be.false;
      });

      it('should not log when silent', () => {
        logWarning('careful', { verbosity: 'silent' });
        expect(stub.called).to.be.false;
      });

      it('should throw when warnings are set to error', () => {
        expect(() => logWarning('careful', { warnings: 'error' })).to.throw('careful');
        expect(stub.called).to.be.false;
      });

      it('should support the legacy string config', () => {
        expect(() => logWarning('careful', 'error')).to.throw('careful');
        expect(stub.called).to.be.false;
      });
    });

    describe('logError', () => {
      it('should throw broken references by default', () => {
        expect(() => logError('broken')).to.throw('broken');
        expect(stub.called).to.be.false;
      });

      it('should log instead of throw when brokenReferences is console', () => {
        logError('broken', { errors: { brokenReferences: 'console' } });
        expect(stub.firstCall.args).to.eql(['broken']);
      });

      it('should not log when silent and brokenReferences is console', () => {
        logError('broken', { verbosity: 'silent', errors: { brokenReferences: 'console' } });
        expect(stub.called).to.be.false;
      });
    });
  });
});
