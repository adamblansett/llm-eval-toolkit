import pc from 'picocolors';

export interface DiffOptions {
  colors?: boolean;
  contextLines?: number;
}

/**
 * Computes a simple line-by-line diff between expected and actual text or serialized values.
 * Returns null if the values are identical or if diff is not applicable.
 */
export function formatDiff(
  expected: unknown,
  actual: unknown,
  options: DiffOptions = {},
): string | null {
  const useColors = options.colors ?? true;
  const expStr = typeof expected === 'string' ? expected : JSON.stringify(expected, null, 2);
  const actStr = typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2);

  if (expStr === actStr) {
    return null;
  }

  const expLines = expStr.split('\n');
  const actLines = actStr.split('\n');

  const diffLines: string[] = [];
  const maxLines = Math.max(expLines.length, actLines.length);

  for (let i = 0; i < maxLines; i++) {
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

  return diffLines.join('\n');
}
