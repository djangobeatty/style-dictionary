import { join } from 'path-unified/posix';

/**
 * Normalize Windows-style path separators to POSIX separators so that
 * `/` and `\` are treated as interchangeable everywhere a buildPath
 * or file destination is used.
 *
 * @param {string} path
 * @returns {string}
 */
export function normalizeSeparators(path) {
  return path.replace(/\\/g, '/');
}

/**
 * Join path segments while treating `/` and `\` as equivalent separators.
 * Segments are normalized to POSIX separators *before* joining, so a
 * trailing separator (of either style) is stripped by `join()` instead of
 * becoming part of the last segment, which would otherwise result in a
 * doubled separator.
 *
 * @param {...string} segments
 * @returns {string}
 */
export function joinPath(...segments) {
  return join(...segments.map((segment) => normalizeSeparators(segment)));
}
