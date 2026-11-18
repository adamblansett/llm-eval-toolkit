import pc from 'picocolors';

export const MAX_DIFF_LINES = 500;

export interface DiffOptions {
  colors?: boolean;
  contextLines?: number;
  maxLines?: number;
}

/**
 * Computes a simple line-by-line diff between expected and actual text or serialized values.
 * Returns null if the values are identical or if diff is not applicable.
 * Truncates at maxLines (default: 500) to protect against memory exhaustion on large outputs.
 */
export function formatDiff(
  expected: unknown,
  actual: unknown,
  options: DiffOptions = {},
): string | null {
  const useColors = options.colors ?? true;
  const lineLimit = options.maxLines ?? MAX_DIFF_LINES;
  const expStr = typeof expected === 'string' ? expected : JSON.stringify(expected, null, 2);
  const actStr = typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2);

  if (expStr === actStr) {
    return null;
  }

  const expLines = expStr.split('\n');
  const actLines = actStr.split('\n');

  const diffLines: string[] = [];
  const totalLines = Math.max(expLines.length, actLines.length);
  const scanLimit = Math.min(totalLines, lineLimit);

  for (let i = 0; i < scanLimit; i++) {
    const e = expLines[i];
    const a = actLines[i];

    if (e === a) {
      diffLines.push(`  ${e}`);
    } else {
      if (e !== undefined) {
        const line = `- ${e}`;
        diffLines.push(useColors ? pc.red(line) : line);
      }
      if (a !== undefined) {
        const line = `+ ${a}`;
        diffLines.push(useColors ? pc.green(line) : line);
      }
    }
  }

  if (totalLines > lineLimit) {
    const truncateNotice = `  ... [diff truncated: ${totalLines - lineLimit} remaining lines omitted for display safety]`;
    diffLines.push(useColors ? pc.dim(truncateNotice) : truncateNotice);
  }

  return diffLines.join('\n');
}
