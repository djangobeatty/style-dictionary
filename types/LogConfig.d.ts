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
 * How warnings (token collisions, filtered out references) are handled.
 * - `warn`: log them to the console
 * - `error`: throw an error instead of logging
 * - `disabled`: don't log nor throw
 */
export type LogWarningLevel = 'warn' | 'error' | 'disabled';

/**
 * How much detail is logged.
 * - `default`: concise messages, errors and warnings are grouped and summarized
 * - `verbose`: every single collision/reference error is listed
 * - `silent`: nothing is logged, errors are still thrown
 */
export type LogVerbosity = 'default' | 'verbose' | 'silent';

export interface LogConfig {
  warnings?: LogWarningLevel;
  verbosity?: LogVerbosity;
}

/**
 * A fully resolved log config, every property is guaranteed to be set.
 */
export type ResolvedLogConfig = Required<LogConfig>;

/**
 * Shorthand for `{ warnings: 'warn' | 'error' }`, kept around because that
 * used to be the only way of configuring logging.
 */
export type LogConfigShorthand = 'warn' | 'error';
