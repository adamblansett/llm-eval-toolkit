import { describe, it, expect } from 'vitest';
import { formatDiff } from '../../../src/utils/diff.js';

describe('formatDiff', () => {
  it('returns null when expected and actual are identical strings', () => {
    expect(formatDiff('hello\nworld', 'hello\nworld')).toBeNull();
  });

  it('returns null when expected and actual are identical objects', () => {
    expect(formatDiff({ a: 1, b: 'two' }, { a: 1, b: 'two' })).toBeNull();
  });

  it('generates line diff with - and + for string differences without colors', () => {
    const diff = formatDiff('foo\nbar', 'foo\nbaz', { colors: false });
    expect(diff).not.toBeNull();
    expect(diff).toContain('  foo');
    expect(diff).toContain('- bar');
    expect(diff).toContain('+ baz');
  });

  it('handles added lines when actual has more lines', () => {
    const diff = formatDiff('line1', 'line1\nline2', { colors: false });
    expect(diff).not.toBeNull();
    expect(diff).toContain('  line1');
    expect(diff).toContain('+ line2');
  });

  it('handles removed lines when expected has more lines', () => {
    const diff = formatDiff('line1\nline2', 'line1', { colors: false });
    expect(diff).not.toBeNull();
    expect(diff).toContain('  line1');
    expect(diff).toContain('- line2');
  });

  it('formats structured objects by serializing to JSON', () => {
    const diff = formatDiff({ count: 1 }, { count: 2 }, { colors: false });
    expect(diff).not.toBeNull();
    expect(diff).toContain('-   "count": 1');
    expect(diff).toContain('+   "count": 2');
  });
});
