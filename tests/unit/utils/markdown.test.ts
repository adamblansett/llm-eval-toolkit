import { describe, it, expect } from 'vitest';
import { stripCodeFences } from '../../../src/utils/markdown.js';

describe('stripCodeFences', () => {
  it('returns plain text unchanged when no markdown fences are present', () => {
    const raw = '{"key": "value"}';
    expect(stripCodeFences(raw)).toBe('{"key": "value"}');
  });

  it('strips ```json code fences with language identifier', () => {
    const fenced = '```json\n{"status": "ok"}\n```';
    expect(stripCodeFences(fenced)).toBe('{"status": "ok"}');
  });

  it('strips ``` code fences without language identifier', () => {
    const fenced = '```\n{"name": "test"}\n```';
    expect(stripCodeFences(fenced)).toBe('{"name": "test"}');
  });

  it('strips single backticks wrapping the whole string', () => {
    const wrapped = '`{"a": 1}`';
    expect(stripCodeFences(wrapped)).toBe('{"a": 1}');
  });

  it('trims leading/trailing whitespace outside code fences', () => {
    const fenced = '   \n```typescript\nconst x = 1;\n```\n  ';
    expect(stripCodeFences(fenced)).toBe('const x = 1;');
  });

  it('returns non-string values as-is', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(stripCodeFences(123 as any)).toBe(123);
  });
});
