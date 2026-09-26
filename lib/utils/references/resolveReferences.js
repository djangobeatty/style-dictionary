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

import GroupMessages from '../groupMessages.js';
import getPathFromName from './getPathFromName.js';
import getName from './getName.js';
import getValueByPath from './getValueByPath.js';
import usesReferences from './usesReferences.js';
import createReferenceRegex from './createReferenceRegex.js';
import defaults from './defaults.js';

const PROPERTY_REFERENCE_WARNINGS = GroupMessages.GROUP.PropertyReferenceWarnings;

/**
 * Strip the value property from a reference name, so `color.base.value`
 * becomes `color.base`. The stack mixes both shapes depending on whether an
 * entry came from the current context (includes the value key) or from a
 * reference in a token value (does not).
 * @param {string} name
 * @param {string} separator
 * @param {string} valProp
 * @returns {string[]}
 */
function getTokenPath(name, separator, valProp) {
  const path = getPathFromName(name, separator);
  if (path[path.length - 1] === valProp) {
    return path.slice(0, -1);
  }
  return path;
}

/**
 * Find the source file of the token that contains a broken reference, by
 * walking the reference stack from the most recent reference backwards.
 * The last entry on the stack is the dangling reference itself, which by
 * definition cannot be found in the token tree.
 * @param {string[]} stack - the chain of reference names that led here
 * @param {DesignTokens} tokens
 * @param {string} separator
 * @param {string} valProp
 * @returns {string|undefined}
 */
function getSourceFilePath(stack, tokens, separator, valProp) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const path = getPathFromName(stack[i], separator);
    // try the path as-is first, then without a trailing value property, since
    // entries coming from the current context include the value key
    const candidates = [path];
    if (path.length > 1 && path[path.length - 1] === valProp) {
      candidates.push(path.slice(0, -1));
    }
    for (const candidate of candidates) {
      const token = getValueByPath(candidate, tokens);
      if (token && typeof token === 'object' && typeof token.filePath === 'string') {
        return token.filePath;
      }
    }
  }
  return undefined;
}

/**
 * Extra detail appended to a reference warning when running verbose: the
 * source file of the token holding the broken reference and the chain of
 * token paths that was followed to reach it.
 * @param {string[]} stack
 * @param {DesignTokens} tokens
 * @param {string} separator
 * @param {string} valProp
 * @returns {string}
 */
function verboseReferenceDetails(stack, tokens, separator, valProp) {
  const filePath = getSourceFilePath(stack, tokens, separator, valProp);
  const details = [];
  if (filePath) {
    details.push(`in ${filePath}`);
  }
  if (stack.length > 0) {
    details.push(
      stack.map((name) => getTokenPath(name, separator, valProp).join(separator)).join(' -> '),
    );
  }
  return details.length > 0 ? `\n    ${details.join('\n    ')}` : '';
}

/**
 * @typedef {import('../../../types/Config.d.ts').ResolveReferencesOptions} RefOpts
 * @typedef {import('../../../types/Config.d.ts').ResolveReferencesOptionsInternal} RefOptsInternal
 * @typedef {import('../../../types/DesignToken.d.ts').DesignTokens} DesignTokens
 * @typedef {import('../../../types/DesignToken.d.ts').DesignToken} DesignToken
 */

/**
 * Public API wrapper around the functon below this one
 * @param {string} value
 * @param {DesignTokens} tokens
 * @param {RefOpts} [opts]
 * @returns {string|number|undefined}
 */
export function resolveReferences(value, tokens, opts) {
  return _resolveReferences(value, tokens, { ...opts, throwImmediately: true });
}

/**
 * Utility to resolve references inside a string value
 * @param {string} value
 * @param {DesignTokens} tokens
 * @param {RefOptsInternal} [opts]
 * @returns {string|number|undefined}
 */
export function _resolveReferences(
  value,
  tokens,
  {
    regex,
    separator = defaults.separator,
    opening_character = defaults.opening_character,
    closing_character = defaults.closing_character,
    ignorePaths = [],
    usesDtcg = false,
    // for internal usage
    current_context = [],
    stack = [],
    foundCirc = {},
    firstIteration = true,
    throwImmediately = false,
    verbose = false,
  } = {},
) {
  const reg = regex ?? createReferenceRegex({ opening_character, closing_character, separator });
  /** @type {DesignToken|string|number|undefined} */
  let to_ret = value;
  /** @type {DesignToken|string|number|undefined} */
  let ref;
  const valProp = usesDtcg ? '$value' : 'value';

  // When we know the current context:
  // the key associated with the value that we are resolving the reference for
  // Then we can push this to the stack to improve our circular reference warnings
  // by starting them with the key
  if (firstIteration && current_context.length > 0) {
    stack.push(getName(current_context));
  }

  /**
   * Replace the reference inline, but don't replace the whole string because
   * references can be part of the value such as "1px solid {color.border.light}"
   */
  value.replace(reg, (match, /** @type {string} */ variable) => {
    variable = variable.trim();

    // Find what the value is referencing
    const pathName = getPathFromName(variable, separator);

    const refHasValue = valProp === pathName[pathName.length - 1];

    // FIXME: shouldn't these two "refHasValue" conditions be reversed??
    if (refHasValue && ignorePaths.indexOf(variable) !== -1) {
      return '';
    } else if (!refHasValue && ignorePaths.indexOf(`${variable}.${valProp}`) !== -1) {
      return '';
    }

    stack.push(variable);
    ref = getValueByPath(pathName, tokens);

    // If the reference doesn't end in 'value'
    // and
    // the reference points to someplace that has a `value` attribute
    // we should take the '.value' of the reference
    // per the DTCG draft spec where references do not have .value
    // https://design-tokens.github.io/community-group/format/#aliases-references
    if (!refHasValue && ref && Object.hasOwn(ref, valProp)) {
      ref = ref[valProp];
    }

    if (typeof ref !== 'undefined') {
      if (typeof ref === 'string' || typeof ref === 'number') {
        to_ret = value.replace(match, `${ref}`);

        // Recursive, therefore we can compute multi-layer variables like a = b, b = c, eventually a = c
        if (usesReferences(to_ret, reg)) {
          const reference = to_ret.slice(1, -1);

          // Compare to found circular references
          if (Object.hasOwn(foundCirc, reference)) {
            // If the current reference is a member of a circular reference, do nothing
          } else if (stack.indexOf(reference) !== -1) {
            // If the current stack already contains the current reference, we found a new circular reference
            // chop down only the circular part, save it to our circular reference info, and spit out an error

            // Get the position of the existing reference in the stack
            const stackIndexReference = stack.indexOf(reference);

            // Get the portion of the stack that starts at the circular reference and brings you through until the end
            const circStack = stack.slice(stackIndexReference);

            // For all the references in this list, add them to the list of references that end up in a circular reference
            circStack.forEach(function (key) {
              foundCirc[key] = true;
            });

            // Add our found circular reference to the end of the cycle
            circStack.push(reference);

            // Add circ reference info to our list of warning messages
            const warning = `Circular definition cycle: ${circStack.join(', ')}`;
            if (throwImmediately) {
              throw new Error(warning);
            } else {
              GroupMessages.add(
                PROPERTY_REFERENCE_WARNINGS,
                'Circular definition cycle:  ' +
                  circStack.join(', ') +
                  (verbose ? verboseReferenceDetails(stack, tokens, separator, valProp) : ''),
              );
            }
          } else {
            to_ret = _resolveReferences(to_ret, tokens, {
              regex: reg,
              ignorePaths,
              usesDtcg,
              current_context,
              separator,
              stack,
              foundCirc,
              firstIteration: false,
              verbose,
            });
          }
        }
        // if evaluated value is a number and equal to the reference, we want to keep the type
        if (typeof ref === 'number' && ref.toString() === to_ret) {
          to_ret = ref;
        }
      } else {
        // if evaluated value is not a string or number, we want to keep the type
        to_ret = ref;
      }
    } else {
      // User might have passed current_context option which is path (arr) pointing to key
      // that this value is associated with, helpful for debugging
      const context = getName(current_context, { separator });
      const warning = `Reference doesn't exist:${
        context ? ` ${context}` : ''
      } tries to reference ${variable}, which is not defined.${
        verbose ? verboseReferenceDetails(stack, tokens, separator, valProp) : ''
      }`;
      if (throwImmediately) {
        throw new Error(warning);
      } else {
        GroupMessages.add(PROPERTY_REFERENCE_WARNINGS, warning);
      }
      to_ret = ref;
    }
    stack.pop();

    return '';
  });

  return to_ret;
}
