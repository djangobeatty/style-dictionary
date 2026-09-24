import { resolveMap } from './resolveMap.js';
import { deepmerge } from './deepmerge.js';
import isPlainObject from 'is-plain-obj';

/**
 * @typedef {import('../../types/DesignToken.d.ts').DesignToken} DesignToken
 * @typedef {import('../../types/DesignToken.d.ts').TransformedToken} TransformedToken
 * @typedef {import('../../types/DesignToken.d.ts').PreprocessedTokens} PreprocessedTokens
 * @typedef {import('../../types/Config.d.ts').Expand} Expand
 * @typedef {import('../../types/Config.d.ts').ExpandConfig} ExpandConfig
 * @typedef {import('../../types/Config.d.ts').ExpandFilter} ExpandFilter
 * @typedef {import('../../types/Config.d.ts').Config} Config
 * @typedef {import('../../types/Config.d.ts').PlatformConfig} PlatformConfig
 */

export const DTCGTypesMap = {
  // https://design-tokens.github.io/community-group/format/#border
  border: {
    style: 'strokeStyle',
    width: 'dimension',
  },
  // https://design-tokens.github.io/community-group/format/#transition
  transition: {
    delay: 'duration',
    // needs more discussion https://github.com/design-tokens/community-group/issues/103
    timingFunction: 'cubicBezier',
  },
  // https://design-tokens.github.io/community-group/format/#shadow
  shadow: {
    offsetX: 'dimension',
    offsetY: 'dimension',
    blur: 'dimension',
    spread: 'dimension',
  },
  // https://design-tokens.github.io/community-group/format/#gradient
  gradient: {
    position: 'number',
  },
  // https://design-tokens.github.io/community-group/format/#typography
  typography: {
    fontSize: 'dimension',
    letterSpacing: 'dimension',
    lineHeight: 'number',
  },
  // https://design-tokens.github.io/community-group/format/#object-value
  strokeStyle: {
    dashArray: 'dimension',
  },
};

/**
 * expandTypesMap and this function may be slightly confusing,
 * refer to the unit tests for a better explanation
 * @param {string} subtype
 * @param {string} compositionType
 * @param {Expand['typesMap']} expandTypesMap
 * @returns {string}
 */
export function getTypeFromMap(subtype, compositionType, expandTypesMap = {}) {
  const typeMap = deepmerge(DTCGTypesMap, expandTypesMap);
  // the map might exist within the compositionType
  const mapObjForComp = typeMap[compositionType];
  // or instead, it may be on the top-level, independent of the compositionType
  const mappedSubType = typeMap[subtype];
  if (typeof mapObjForComp === 'object' && mapObjForComp[subtype]) {
    return mapObjForComp[subtype];
    // the type mapping might be on the top-level, independent of the compositionType
  } else if (typeof mappedSubType === 'string') {
    return mappedSubType;
  }
  return subtype;
}

/**
 * @param {DesignToken} token
 * @param {Config} opts
 * @param {PlatformConfig} [platform]
 */
function shouldExpand(token, opts, platform) {
  const expand = platform?.expand ?? opts.expand ?? false;

  /** @type {ExpandFilter | boolean} */
  let condition = false;
  let reverse = false;

  if (typeof expand === 'function' || typeof expand === 'boolean') {
    condition = expand;
  } else {
    const type = /** @type {string} */ (opts.usesDtcg ? token.$type : token.type);
    if (expand.include === undefined && expand.exclude === undefined) {
      condition = true;
    }

    if (expand.include) {
      condition =
        typeof expand.include === 'function' ? expand.include : expand.include.includes(type);
    }

    if (/** @type {Expand} */ (expand).exclude) {
      if (expand.include) {
        throw Error(
          'expand.include should not be combined with expand.exclude, use one or the other.',
        );
      }
      condition =
        typeof expand.exclude === 'function' ? expand.exclude : expand.exclude.includes(type);
      reverse = true;
    }
  }

  let result = condition;
  if (typeof condition === 'function') {
    result = condition(token, opts, platform);
  }

  return reverse ? !result : result;
}

/**
 * Decomposes a token's value into the tokens that replace it when expanding.
 * Returns undefined when the value is not an expansion, i.e. when it does not
 * decompose into at least one token, in which case the token must be left as-is.
 *
 * @param {DesignToken} token already resolved refs
 * @param {Config} opts
 * @param {PlatformConfig} [platform]
 * @returns {DesignToken[] | undefined}
 */
function expandTokenValue(token, opts, platform) {
  const uses$ = opts.usesDtcg;
  const valueProp = `${uses$ ? '$' : ''}value`;
  const typeProp = `${uses$ ? '$' : ''}type`;
  // create a copy of the token without the value/type, so that we have all the meta props
  // which have to be inherited in the expanded tokens.
  /** @type {Record<string, unknown>} */
  const copyMeta = {};
  Object.keys(token)
    // either filter $value & $type, or value and type depending on whether $ is used
    .filter(
      (key) =>
        !['$value', 'value', '$type', 'type']
          .filter((key) => (uses$ ? key.startsWith('$') : !key.startsWith('$')))
          .includes(key),
    )
    .forEach((key) => {
      copyMeta[key] = token[key];
    });

  const value = uses$ ? token.$value : token.value;
  // the $type and type may both be missing if the $type is coming from an ancestor token group,
  // however, prior to expand and preprocessors, we run a step so missing $type is added from the closest ancestor
  const compositionType = /** @type {string} */ (uses$ ? token.$type : token.type);
  /** @type {Expand['typesMap']} */
  let typesMap = {};
  const expand = platform?.expand ?? opts.expand;
  if (typeof expand === 'object') {
    typesMap = expand.typesMap ?? {};
  }

  const tokenKey = /** @type {string} */ (token.key);
  // if we're expanding on platform level, we already have a path property
  // we will need to adjust this by adding the new keys of the expanded tokens to the path array
  const basePath = /** @type {string[] | undefined} */ (token.path);

  /**
   * Builds a token that inherits the meta props of the token being expanded,
   * and optionally extends its path with the keys of the expanded token.
   * @param {string} innerKey
   * @param {unknown} innerValue
   * @param {string} innerType
   * @param {string[]} [pathSuffix]
   */
  const buildExpandedToken = (innerKey, innerValue, innerType, pathSuffix = []) => {
    const expandedValue = {
      ...copyMeta,
      [valueProp]: innerValue,
      [typeProp]: innerType,
      key: innerKey,
    };
    if (Array.isArray(basePath)) {
      expandedValue.path = [...basePath, ...pathSuffix];
    }
    return expandedValue;
  };

  /**
   * Expands a single property of a composite token into the tokens that replace it.
   * Nested composite (object) values and array values are recursed into, anything
   * else is stored as a scalar token. A property that does not decompose into
   * tokens is kept as-is.
   * @param {string} innerKey
   * @param {unknown} propValue
   * @param {string} propType
   * @param {string[]} pathSuffix
   * @returns {DesignToken[]}
   */
  const expandProp = (innerKey, propValue, propType, pathSuffix) => {
    const expandedValue = buildExpandedToken(innerKey, propValue, propType, pathSuffix);
    // a nested composite token only gets expanded when the expand config allows it
    if (isPlainObject(propValue) && !shouldExpand(expandedValue, opts, platform)) {
      return [expandedValue];
    }
    // nested composite (object) values and array values may decompose further
    if (isPlainObject(propValue) || Array.isArray(propValue)) {
      const expanded = expandTokenValue(expandedValue, opts, platform);
      // only replace the property when it actually decomposes into tokens
      if (expanded) {
        return expanded;
      }
    }
    return [expandedValue];
  };

  /** @type {DesignToken[]} */
  let tokens = [];

  if (Array.isArray(value) && value.every((item) => isPlainObject(item))) {
    // multi-value arrays where each item is an object, e.g. shadow tokens,
    // are expanded into nested indexed token groups
    // https://github.com/design-tokens/community-group/issues/100 there seems to be a consensus for this
    // so this code adds forward-compatibility with that
    // more than 1 item means multi-value, meaning we should add the index to the expanded result
    const indexed = value.length > 1;
    tokens = value.flatMap((objectVal, index) => {
      const key = indexed ? tokenKey.replace('}', `.${index + 1}}`) : tokenKey;
      return Object.entries(objectVal).flatMap(([propKey, propValue]) =>
        expandProp(
          key.replace('}', `.${propKey}}`),
          propValue,
          getTypeFromMap(propKey, compositionType, typesMap),
          indexed ? [`${index + 1}`, propKey] : [propKey],
        ),
      );
    });
  } else if (Array.isArray(value)) {
    // any other array value is itemized into one scalar-valued token per item,
    // e.g. a cubicBezier value [0.42, 0, 0.58, 1] or a composite's dashArray property
    tokens = value.map((item, index) => {
      const innerKey = tokenKey.replace('}', `.${index + 1}}`);
      return buildExpandedToken(innerKey, item, compositionType, [`${index + 1}`]);
    });
  } else if (isPlainObject(value)) {
    tokens = Object.entries(value).flatMap(([propKey, propValue]) =>
      expandProp(
        tokenKey.replace('}', `.${propKey}}`),
        propValue,
        getTypeFromMap(propKey, compositionType, typesMap),
        [propKey],
      ),
    );
  }

  // a value that decomposes into no tokens is not an expansion: leave the token as-is
  return tokens.length > 0 ? tokens : undefined;
}

/**
 *
 * @param {DesignToken} token already resolved refs
 * @param {Map<string, DesignToken>} tokenMap
 * @param {Config} opts
 * @param {PlatformConfig} [platform]
 */
export function expandTokenInMap(token, tokenMap, opts, platform) {
  const tokens = expandTokenValue(token, opts, platform);
  // when the value is not an expansion, there is nothing to replace the token with,
  // so it must be left as-is rather than deleted
  if (!tokens) {
    return;
  }
  tokenMap.delete(/** @type {string} */ (token.key));
  tokens.forEach((expandedToken) => {
    tokenMap.set(/** @type {string} */ (expandedToken.key), expandedToken);
  });
}

/**
 * @param {Map<string, DesignToken>} tokenMap
 * @param {Config} opts
 * @param {PlatformConfig} [platform]
 */
export function expandTokens(tokenMap, opts, platform) {
  const uses$ = opts.usesDtcg;
  // create a copy in which we will do mutations
  const copy = structuredClone(tokenMap);
  // create another copy which has resolved refs
  const copyResolved = structuredClone(tokenMap);
  try {
    // @ts-expect-error in this instance it is acceptable to pass DesignTokens before transform step
    resolveMap(copyResolved, { usesDtcg: uses$, objectsOnly: true });
  } catch (_e) {
    console.error(_e);
    // do nothing, references may be broken but now is not the time to
    // complain about it, as we're just doing this here so we can expand
    // tokens that reference object-value tokens that need to be expanded
  }

  Array.from(copyResolved).forEach(([, token]) => {
    let value = uses$ ? token.$value : token.value;
    if (
      isPlainObject(value) ||
      // support arrays, either multi-value arrays where each item is an object (e.g. shadow tokens)
      // or arrays of scalars (e.g. cubicBezier tokens)
      Array.isArray(value)
    ) {
      if (shouldExpand(token, opts, platform)) {
        expandTokenInMap(token, copy, opts, platform);
      }
    }
  });

  return copy;
}
