import { describe, it, expect } from 'vitest';
import { safePreview } from '../../../src/utils/sanitizer.js';

describe('safePreview', () => {
  it('formats primitives safely', () => {
    expect(safePreview('hello')).toBe('"hello"');
    expect(safePreview(42)).toBe('42');
    expect(safePreview(true)).toBe('true');
    expect(safePreview(null)).toBe('null');
    expect(safePreview(undefined)).toBe('undefined');
  });

  it('formats small objects as json', () => {
    expect(safePreview({ a: 1 })).toBe('{"a":1}');
    expect(safePreview([1, 2])).toBe('[1,2]');
  });

  it('truncates long strings to prevent log flooding', () => {
    const longString = 'a'.repeat(300);
    const preview = safePreview(longString, 50);
    expect(preview.length).toBeLessThanOrEqual(55);
    expect(preview).toContain('...');
  });
});
