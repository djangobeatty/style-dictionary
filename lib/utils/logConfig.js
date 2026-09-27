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
 * @typedef {import('../../types/Config.d.ts').LogConfigInput} LogConfigInput
 * @typedef {import('../../types/Config.d.ts').LogWarnings} LogWarnings
 * @typedef {import('../../types/Config.d.ts').LogVerbosity} LogVerbosity
 * @typedef {{ warnings: LogWarnings, verbosity: LogVerbosity }} NormalizedLogConfig
 */

/** @type {NormalizedLogConfig} */
export const defaultLogConfig = { warnings: 'warn', verbosity: 'default' };

/**
 * Normalizes the `log` config option into a consistent object.
 *
 * The `log` option can either be a shorthand string (`'warn'` or `'error'`)
 * for backwards compatibility, or an object that allows configuring the
 * verbosity of the output (`'default'`, `'verbose'` or `'silent'`).
 *
 * @param {LogConfigInput|NormalizedLogConfig|undefined} [log]
 * @returns {NormalizedLogConfig}
 */
export function normalizeLog(log) {
  if (log === 'warn' || log === 'error') {
    return { warnings: log, verbosity: 'default' };
  }
  if (log && typeof log === 'object') {
    return {
      warnings: log.warnings ?? defaultLogConfig.warnings,
      verbosity: log.verbosity ?? defaultLogConfig.verbosity,
    };
  }
  return { ...defaultLogConfig };
}

/**
 * Resolves the log config for a platform by merging its `log` option with the
 * already-resolved log config of the Style Dictionary instance.
 *
 * A platform is only allowed to override the `warnings` mode. The `verbosity`
 * always comes from the instance config, which is where an override such as
 * the CLI `--verbose` / `--silent` flags is applied. This guarantees a
 * platform-level `log` can never shadow that override.
 *
 * The instance value is returned untouched when the platform does not set a
 * `log`, so the shape the user provided is preserved.
 *
 * @param {LogConfigInput|undefined} platformLog
 * @param {LogConfigInput|NormalizedLogConfig|undefined} instanceLog
 * @returns {LogConfigInput|NormalizedLogConfig|undefined}
 */
export function mergeLogConfig(platformLog, instanceLog) {
  if (platformLog === undefined) {
    return instanceLog;
  }
  const instance = normalizeLog(instanceLog);
  const warnings =
    typeof platformLog === 'string'
      ? platformLog
      : (platformLog && platformLog.warnings) ?? instance.warnings;
  return { warnings, verbosity: instance.verbosity };
}

/**
 * Whether all logging output should be suppressed.
 * @param {LogConfigInput|NormalizedLogConfig|undefined} [log]
 * @returns {boolean}
 */
export function isSilent(log) {
  return normalizeLog(log).verbosity === 'silent';
}

/**
 * Whether verbose logging output should be shown, e.g. every individual
 * collision or reference error rather than a concise summary.
 * @param {LogConfigInput|NormalizedLogConfig|undefined} [log]
 * @returns {boolean}
 */
export function isVerbose(log) {
  return normalizeLog(log).verbosity === 'verbose';
}

/**
 * Whether warnings should be thrown as errors instead of being logged.
 * @param {LogConfigInput|NormalizedLogConfig|undefined} [log]
 * @returns {boolean}
 */
export function isErrorMode(log) {
  return normalizeLog(log).warnings === 'error';
}
