import { getReferences } from '../../utils/references/getReferences.js';
import usesReferences from '../../utils/references/usesReferences.js';
import { commentStyles, commentPositions, propertyFormatNames } from '../../enums/index.js';

/**
 * @typedef {import('../../../types/DesignToken.d.ts').TransformedToken} TransformedToken
 * @typedef {import('../../../types/DesignToken.d.ts').Dictionary} Dictionary
 * @typedef {import('../../../types/File.d.ts').FormattingOptions} Formatting
 * @typedef {import('../../../types/Format.d.ts').OutputReferences} OutputReferences
 */

const { short, long, none } = commentStyles;
const { above, inline } = commentPositions;
const { css, sass, less, stylus } = propertyFormatNames;

/**
 * The standard base64 alphabet, including `=` padding. A value matching this can
 * never contain a quote, backslash or newline, so it needs no escaping inside a
 * CSS string literal.
 */
const base64ValueRegex = /^[A-Za-z0-9+/=]*$/;

/**
 * Base64 asset values are emitted as double-quoted string literals in CSS-family
 * outputs, because `+`, `/` and `=` padding is otherwise read as arithmetic or
 * division by Sass/Less, or is a parse error.
 *
 * Only values inside the base64 alphabet are wrapped. Every other asset value —
 * including the `url(...)` produced by `asset/url` and values that already carry
 * their own quoting — is emitted unchanged, so arbitrary input never enters a
 * constructed string literal and there is no escaping step to get wrong.
 * @param {TransformedToken} token
 * @param {unknown} value
 * @param {boolean} usesDtcg
 * @returns {unknown}
 */
function quoteBase64AssetValue(token, value, usesDtcg) {
  if ((usesDtcg ? token.$type : token.type) !== 'asset') {
    return value;
  }
  if (typeof value !== 'string' || !base64ValueRegex.test(value)) {
    return value;
  }

  return `"${value}"`;
}

/**
 * Find the first occurrence of `needle` in `haystack`, at or after `from`, that
 * has not already been claimed by another reference. Occurrences overlapping an
 * already claimed range are skipped, so every reference is matched exactly once
 * and never inside text that was emitted for a different reference.
 * @param {string} haystack
 * @param {string} needle
 * @param {any[]} claimed
 * @param {number} from
 * @returns {number} index of the occurrence, or -1 when there is none
 */
function findUnclaimedOccurrence(haystack, needle, claimed, from) {
  if (needle === '') {
    return -1;
  }
  for (
    let index = haystack.indexOf(needle, from);
    index !== -1;
    index = haystack.indexOf(needle, index + 1)
  ) {
    let overlaps = false;
    for (let i = index; i < index + needle.length; i++) {
      if (claimed[i]) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      return index;
    }
  }
  return -1;
}

/**
 * @type {Formatting}
 */
const defaultFormatting = {
  prefix: '',
  commentStyle: long,
  commentPosition: inline,
  indentation: '',
  separator: ' =',
  suffix: ';',
};

/**
 * Split a string comment by newlines and
 * convert to multi-line comment if necessary
 * @param {string} to_ret_token
 * @param {string | undefined} comment
 * @param {Formatting} options
 * @returns {string}
 */
export function addComment(to_ret_token, comment, options) {
  const { commentStyle, indentation } = options;
  let { commentPosition } = options;

  if (!comment || commentStyle === none) {
    return to_ret_token;
  }

  const commentsByNewLine = comment.split('\n');
  if (commentsByNewLine.length > 1) {
    commentPosition = above;
  }

  let processedComment;
  switch (commentStyle) {
    case short:
      if (commentPosition === inline) {
        processedComment = `// ${comment}`;
      } else {
        processedComment = commentsByNewLine.reduce(
          (acc, curr) => `${acc}${indentation}// ${curr}\n`,
          '',
        );
        // remove trailing newline
        processedComment = processedComment.replace(/\n$/g, '');
      }
      break;
    case long:
      if (commentsByNewLine.length > 1) {
        processedComment = commentsByNewLine.reduce(
          (acc, curr) => `${acc}${indentation} * ${curr}\n`,
          `${indentation}/**\n`,
        );
        processedComment += `${indentation} */`;
      } else {
        processedComment = `${commentPosition === above ? indentation : ''}/** ${comment} */`;
      }
      break;
  }

  if (commentPosition === above) {
    // put the comment above the token if it's multi-line or if commentStyle ended with -above
    to_ret_token = `${processedComment}\n${to_ret_token}`;
  } else {
    to_ret_token = `${to_ret_token} ${processedComment}`;
  }

  return to_ret_token;
}

/**
 * Creates a function that can be used to format a token. This can be useful
 * to use as the function on `dictionary.allTokens.map`. The formatting
 * is configurable either by supplying a `format` option or a `formatting` object
 * which uses: prefix, indentation, separator, suffix, and commentStyle.
 * @memberof module:formatHelpers
 * @name createPropertyFormatter
 * @example
 * ```javascript
 * import { propertyFormatNames } from 'style-dictionary/enums';
 *
 * StyleDictionary.registerFormat({
 *   name: 'myCustomFormat',
 *   format: function({ dictionary, options }) {
 *     const { outputReferences } = options;
 *     const formatProperty = createPropertyFormatter({
 *       outputReferences,
 *       dictionary,
 *       format: propertyFormatNames.css
 *     });
 *     return dictionary.allTokens.map(formatProperty).join('\n');
 *   }
 * });
 * ```
 * @param {Object} options
 * @param {OutputReferences} [options.outputReferences] - Whether or not to output references. You will want to pass this from the `options` object sent to the format function.
 * @param {boolean} [options.outputReferenceFallbacks] - Whether or not to output css variable fallback values when using output references. You will want to pass this from the `options` object sent to the format function.
 * @param {Dictionary} options.dictionary - The dictionary object sent to the format function
 * @param {string} [options.format] - Available formats are: 'css', 'sass', 'less', and 'stylus'. If you want to customize the format and can't use one of those predefined formats, use the `formatting` option
 * @param {Formatting} [options.formatting] - Custom formatting properties that define parts of a declaration line in code. The configurable strings are: `prefix`, `indentation`, `separator`, `suffix`, `lineSeparator`, `fileHeaderTimestamp`, `header`, `footer`, `commentStyle` and `commentPosition`. Those are used to generate a line like this: `${indentation}${prefix}${token.name}${separator} ${token.value}${suffix}`. The remaining formatting options are used for the fileHeader helper.
 * @param {boolean} [options.themeable] [false] - Whether tokens should default to being themeable.
 * @param {boolean} [options.usesDtcg] [false] - Whether DTCG token syntax should be uses.
 * @returns {(token: import('../../../types/DesignToken.d.ts').TransformedToken) => string}
 */
export default function createPropertyFormatter({
  outputReferences = false,
  outputReferenceFallbacks = false,
  dictionary,
  format,
  formatting = {},
  themeable = false,
  usesDtcg = false,
}) {
  /** @type {Formatting} */
  const formatDefaults = {};
  switch (format) {
    case css:
      formatDefaults.prefix = '--';
      formatDefaults.indentation = '  ';
      formatDefaults.separator = ':';
      break;
    case sass:
      formatDefaults.prefix = '$';
      formatDefaults.commentStyle = short;
      formatDefaults.indentation = '';
      formatDefaults.separator = ':';
      break;
    case less:
      formatDefaults.prefix = '@';
      formatDefaults.commentStyle = short;
      formatDefaults.indentation = '';
      formatDefaults.separator = ':';
      break;
    case stylus:
      formatDefaults.prefix = '$';
      formatDefaults.commentStyle = short;
      formatDefaults.indentation = '';
      formatDefaults.separator = '=';
      break;
  }
  const mergedOptions = {
    ...defaultFormatting,
    ...formatDefaults,
    ...formatting,
  };
  let { prefix, indentation, separator, suffix } = mergedOptions;
  const { tokens, unfilteredTokens } = dictionary;
  const shouldQuoteAssets =
    format === css || format === sass || format === less || format === stylus;
  return function (token) {
    let to_ret_token = `${indentation}${prefix}${token.name}${separator} `;
    let value = usesDtcg ? token.$value : token.value;
    if (shouldQuoteAssets) {
      value = quoteBase64AssetValue(token, value, usesDtcg);
    }
    const originalValue = usesDtcg ? token.original.$value : token.original.value;

    const shouldOutputRef =
      usesReferences(originalValue) &&
      (typeof outputReferences === 'function'
        ? outputReferences(token, { dictionary, usesDtcg })
        : outputReferences);
    /**
     * A single value can have multiple references either by interpolation:
     * "value": "{size.border.width} solid {color.border.primary}"
     * or if the value is an object:
     * "value": {
     *    "size": "{size.border.width}",
     *    "style": "solid",
     *    "color": "{color.border.primary.value"}
     * }
     * This will see if there are references and if there are, replace
     * the resolved value with the reference's name.
     */
    if (shouldOutputRef) {
      // Formats that use this function expect `value` to be a string
      // or else you will get '[object Object]' in the output
      const refs = getReferences(
        originalValue,
        tokens,
        {
          unfilteredTokens,
          usesDtcg,
          warnImmediately: false,
          filteredReferences: dictionary.filteredReferences,
        },
        [],
      );

      // original can either be an object value, which requires transitive value transformation in web CSS formats
      // or a different (primitive) type, meaning it can be stringified.
      const originalIsObject = typeof originalValue === 'object' && originalValue !== null;

      if (!originalIsObject) {
        // TODO: find a better way to deal with object-value tokens and outputting refs
        // e.g. perhaps it is safer not to output refs when the value is transformed to a non-object
        // for example for CSS-like formats we always flatten to e.g. strings

        // when original is object value, we replace value by matching ref.value and putting a var instead.
        // Due to the original.value being an object, it requires transformation, so undoing the transformation
        // by replacing value with original.value is not possible. (this is the early v3 approach to outputting refs)

        // when original is string value, we replace value by matching original.value and putting a var instead
        // this is more friendly to transitive transforms that transform the string values (v4 way of outputting refs)
        value = originalValue;
      }

      // For object/array-valued tokens the transformed value has already been
      // flattened to a string (e.g. `0 8px 16px -8px rgba(...), 0 0 1px 0 rgba(...)`),
      // so each reference has to be matched against its own resolved value in that
      // string. Matching happens against the immutable flattened value and every
      // occurrence can only be claimed once: references that resolve to the same
      // value (e.g. several `0` dimensions across shadow layers) each keep their own
      // slot, and a fallback value can never be matched inside a `var(...)` that was
      // already emitted for another reference.
      const flattenedValue = originalIsObject ? `${value}` : '';
      const claimedOccurrences = new Array(flattenedValue.length).fill(false);
      /** @type {{ index: number, length: number, replacement: string }[]} */
      const objectReplacements = [];
      let searchStart = 0;

      refs.forEach((ref) => {
        // value should be a string that contains the resolved reference
        // because Style Dictionary resolved this in the resolution step.
        // Here we are undoing that by replacing the value with
        // the reference's name
        if (Object.hasOwn(ref, `${usesDtcg ? '$' : ''}value`) && Object.hasOwn(ref, 'name')) {
          const refVal = usesDtcg ? ref.$value : ref.value;
          const replaceFunc = function () {
            if (format === css) {
              if (outputReferenceFallbacks) {
                return `var(${prefix}${ref.name}, ${refVal})`;
              } else {
                return `var(${prefix}${ref.name})`;
              }
            } else {
              return `${prefix}${ref.name}`;
            }
          };
          if (originalIsObject) {
            // technically speaking a reference can be made to a number or boolean token,
            // in this case we stringify it first
            const refValStr = `${refVal}`;
            // Search forward from the previous match first, so references keep the
            // order they have in the flattened value. Fall back to searching from the
            // start for transforms that emit properties in a different order than the
            // token's own keys (e.g. typography).
            let index = findUnclaimedOccurrence(
              flattenedValue,
              refValStr,
              claimedOccurrences,
              searchStart,
            );
            if (index === -1) {
              index = findUnclaimedOccurrence(flattenedValue, refValStr, claimedOccurrences, 0);
            }
            if (index === -1) {
              return;
            }
            for (let i = index; i < index + refValStr.length; i++) {
              claimedOccurrences[i] = true;
            }
            searchStart = index + refValStr.length;
            objectReplacements.push({
              index,
              length: refValStr.length,
              replacement: replaceFunc(),
            });
          } else {
            value = `${value}`.replace(
              new RegExp(`{${ref.path.join('\\.')}(\\.\\$?value)?}`, 'g'),
              replaceFunc,
            );
          }
        }
      });

      // Apply the replacements from the highest index down, so the indexes of the
      // replacements still to be applied stay valid while the string is rewritten.
      // The array is in reference order, which is not necessarily index order.
      if (objectReplacements.length > 0) {
        let replacedValue = flattenedValue;
        objectReplacements
          .sort((a, b) => b.index - a.index)
          .forEach(({ index, length, replacement }) => {
            replacedValue =
              replacedValue.slice(0, index) + replacement + replacedValue.slice(index + length);
          });
        value = replacedValue;
      }
    }

    to_ret_token += value;

    const themeable_token = typeof token.themeable === 'boolean' ? token.themeable : themeable;
    if (format === sass && themeable_token) {
      to_ret_token += ' !default';
    }

    to_ret_token += suffix;

    const comment = token.$description ?? token.comment;
    to_ret_token = addComment(to_ret_token, comment, mergedOptions);

    return to_ret_token;
  };
}
