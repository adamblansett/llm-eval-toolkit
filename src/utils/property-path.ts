export interface PathLookupResult {
  found: boolean;
  value: unknown;
}

/**
 * Splits a path expression (e.g., "user.address.street", "items[0].name", 'user["sub.domain"]')
 * into normalized segment tokens.
 */
export function tokenizePath(path: string): string[] {
  if (typeof path !== 'string' || path.trim().length === 0) {
    return [];
  }

  const tokens: string[] = [];
  let i = 0;
  const len = path.length;

  while (i < len) {
    const ch = path[i];

    if (ch === '.') {
      i++;
      continue;
    }

    if (ch === '[') {
      i++; // skip '['
      if (i < len && (path[i] === "'" || path[i] === '"')) {
        const quote = path[i];
        i++; // skip quote
        let token = '';
        while (i < len && path[i] !== quote) {
          if (path[i] === '\\' && i + 1 < len) {
            token += path[i + 1];
            i += 2;
          } else {
            token += path[i];
            i++;
          }
        }
        if (i < len && path[i] === quote) {
          i++; // skip closing quote
        }
        while (i < len && path[i] !== ']') {
          i++; // advance to closing bracket
        }
        if (i < len && path[i] === ']') {
          i++; // skip ']'
        }
        tokens.push(token);
      } else {
        let token = '';
        while (i < len && path[i] !== ']') {
          token += path[i];
          i++;
        }
        if (i < len && path[i] === ']') {
          i++; // skip ']'
        }
        tokens.push(token.trim());
      }
      continue;
    }

    let token = '';
    while (i < len && path[i] !== '.' && path[i] !== '[') {
      token += path[i];
      i++;
    }
    if (token.length > 0) {
      tokens.push(token);
    }
  }

  return tokens.filter((part) => part.length > 0);
}

/**
 * Retrieves a nested value from an object or array using dot or bracket notation.
 * Returns `{ found: true, value }` if path exists, or `{ found: false, value: undefined }`.
 */
export function getValueByPath(target: unknown, path: string): PathLookupResult {
  if (path === '' || path === '.') {
    return { found: true, value: target };
  }

  const segments = tokenizePath(path);
  if (segments.length === 0) {
    return { found: false, value: undefined };
  }

  let current: unknown = target;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return { found: false, value: undefined };
    }

    if (segment === '__proto__' || segment === 'prototype' || segment === 'constructor') {
      return { found: false, value: undefined };
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isInteger(index) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return { found: false, value: undefined };
      }
    } else {
      if (Object.prototype.hasOwnProperty.call(current, segment)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return { found: false, value: undefined };
      }
    }
  }

  return { found: true, value: current };
}
