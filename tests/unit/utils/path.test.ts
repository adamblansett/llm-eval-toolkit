import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveSafePath, assertPathWithinRoot } from '../../../src/utils/path.js';

describe('path utilities', () => {
  it('resolves relative paths against base directory', () => {
    const base = '/tmp/my-project';
    expect(resolveSafePath('data.json', base)).toBe(path.resolve(base, 'data.json'));
    expect(resolveSafePath('./evals/test.json', base)).toBe(
      path.resolve(base, 'evals', 'test.json'),
    );
  });

  it('rejects empty paths', () => {
    expect(() => resolveSafePath('')).toThrow('Path must be a non-empty string');
    expect(() => resolveSafePath('   ')).toThrow('Path must be a non-empty string');
  });

  it('assertPathWithinRoot permits valid descendants and rejects traversal attempts', () => {
    const root = '/tmp/sandbox';
    expect(assertPathWithinRoot('file.txt', root)).toBe(path.resolve(root, 'file.txt'));
    expect(assertPathWithinRoot('sub/file.txt', root)).toBe(path.resolve(root, 'sub/file.txt'));

    expect(() => assertPathWithinRoot('../escaped.txt', root)).toThrow(/Path traversal denied/);
    expect(() => assertPathWithinRoot('../../etc/passwd', root)).toThrow(/Path traversal denied/);
  });
});
