export const MAX_LEVENSHTEIN_STRING_LENGTH = 10_000;

/**
 * Computes the Levenshtein edit distance between two strings.
 * Includes algorithmic complexity safety bound to prevent CPU exhaustion DoS.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > MAX_LEVENSHTEIN_STRING_LENGTH || b.length > MAX_LEVENSHTEIN_STRING_LENGTH) {
    throw new Error(
      `Input length exceeds safe threshold for Levenshtein distance (${MAX_LEVENSHTEIN_STRING_LENGTH} chars). Use token Jaccard similarity for large texts.`,
    );
  }

  const m = a.length;
  const n = b.length;

  // Use single-row memory optimization
  let prevRow = new Array<number>(n + 1).fill(0);
  let currRow = new Array<number>(n + 1).fill(0);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= n; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      const prevJ = prevRow[j] ?? 0;
      const currJMinus1 = currRow[j - 1] ?? 0;
      const prevJMinus1 = prevRow[j - 1] ?? 0;

      currRow[j] = Math.min(
        prevJ + 1, // deletion
        currJMinus1 + 1, // insertion
        prevJMinus1 + cost, // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n] ?? 0;
}

/**
 * Computes normalized Levenshtein similarity between 0 (completely different) and 1 (identical).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return Math.max(0, 1.0 - distance / maxLen);
}

/**
 * Computes word/token Jaccard similarity between two strings: |A ∩ B| / |A ∪ B|.
 */
export function jaccardSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;

  const tokensA = new Set(a.split(/\s+/).filter((t) => t.length > 0));
  const tokensB = new Set(b.split(/\s+/).filter((t) => t.length > 0));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 1.0 : intersection / union;
}
