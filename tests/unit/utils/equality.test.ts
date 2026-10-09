import { describe, it, expect } from 'vitest';
import { deepEqual } from '../../../src/utils/equality.js';

describe('deepEqual', () => {
  it('correctly compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('hello', 'hello')).toBe(true);
    expect(deepEqual('hello', 'world')).toBe(false);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it('does not coerce types or case', () => {
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(0, false)).toBe(false);
    expect(deepEqual('', false)).toBe(false);
    expect(deepEqual('Hello', 'hello')).toBe(false);
  });

  it('compares arrays strictly', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
  });

  it('compares objects deeply and independently of key ordering', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: { c: 3 } }, { b: { c: 3 }, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('compares Date and RegExp instances', () => {
    const d1 = new Date('2025-01-01T00:00:00Z');
    const d2 = new Date('2025-01-01T00:00:00Z');
    const d3 = new Date('2025-01-02T00:00:00Z');

    expect(deepEqual(d1, d2)).toBe(true);
    expect(deepEqual(d1, d3)).toBe(false);

    expect(deepEqual(/abc/i, /abc/i)).toBe(true);
    expect(deepEqual(/abc/i, /abc/g)).toBe(false);
    expect(deepEqual(/abc/i, /def/i)).toBe(false);
  });
});
