import { describe, it, expect } from 'vitest';
import { ExactMatchEvaluator } from '../../../src/evaluators/exact-match.js';

describe('ExactMatchEvaluator', () => {
  const evaluator = new ExactMatchEvaluator();

  it('passes on identical string output', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      expected: 'hello world',
      actualOutput: 'hello world',
      config: { type: 'exact_match' },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('Output exactly matches');
  });

  it('fails on string mismatch without silent normalization', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      expected: 'Hello World',
      actualOutput: 'hello world',
      config: { type: 'exact_match' },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Output does not match expected string');
  });

  it('respects ignoreCase flag when explicitly requested', () => {
    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      expected: 'Hello World',
      actualOutput: 'hello world',
      config: { type: 'exact_match', ignoreCase: true },
    });

    expect(result.status).toBe('PASSED');
  });

  it('respects trimWhitespace flag when explicitly requested', () => {
    const result = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      expected: 'hello world',
      actualOutput: '  hello world \n',
      config: { type: 'exact_match', trimWhitespace: true },
    });

    expect(result.status).toBe('PASSED');
  });

  it('respects normalizeNewlines flag when explicitly requested', () => {
    const result = evaluator.evaluate({
      caseId: 'test-5',
      input: 'prompt',
      expected: 'line1\nline2',
      actualOutput: 'line1\r\nline2',
      config: { type: 'exact_match', normalizeNewlines: true },
    });

    expect(result.status).toBe('PASSED');
  });

  it('evaluates structured objects and arrays with deep equality', () => {
    const expected = { a: 1, items: [1, 2, { b: 'c' }] };
    const actual = { a: 1, items: [1, 2, { b: 'c' }] };

    const result = evaluator.evaluate({
      caseId: 'test-6',
      input: 'prompt',
      expected,
      actualOutput: actual,
      config: { type: 'exact_match' },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails on structured object mismatch', () => {
    const expected = { a: 1, b: 2 };
    const actual = { a: 1, b: 3 };

    const result = evaluator.evaluate({
      caseId: 'test-7',
      input: 'prompt',
      expected,
      actualOutput: actual,
      config: { type: 'exact_match' },
    });

    expect(result.status).toBe('FAILED');
    expect(result.diagnostics?.diff).toBeDefined();
    expect(typeof result.diagnostics?.diff).toBe('string');
  });

  it('returns ERROR when no expected value is defined in config or case', () => {
    const result = evaluator.evaluate({
      caseId: 'test-8',
      input: 'prompt',
      actualOutput: 'some text',
      config: { type: 'exact_match' },
    });

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('No expected value specified');
  });

  it('uses config.expected override if provided', () => {
    const result = evaluator.evaluate({
      caseId: 'test-9',
      input: 'prompt',
      expected: 'case-expected',
      actualOutput: 'override-expected',
      config: { type: 'exact_match', expected: 'override-expected' },
    });

    expect(result.status).toBe('PASSED');
  });
});
