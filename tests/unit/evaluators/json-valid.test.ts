import { describe, it, expect } from 'vitest';
import { JsonValidEvaluator } from '../../../src/evaluators/json-valid.js';

describe('JsonValidEvaluator', () => {
  const evaluator = new JsonValidEvaluator();

  it('passes on valid JSON string', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: '{"merchant": "Store", "amount": 10.5}',
      config: { type: 'json' },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('valid JSON');
    expect(result.actual).toEqual({ merchant: 'Store', amount: 10.5 });
  });

  it('fails on malformed JSON string with actionable syntax error', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: '{"merchant": "Store", amount: }',
      config: { type: 'json' },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Output is not valid JSON');
    expect(result.diagnostics?.parseError).toBeDefined();
  });

  it('passes on already-parsed object or array', () => {
    const resultObj = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: { merchant: 'Store', amount: 10.5 },
      config: { type: 'json' },
    });
    expect(resultObj.status).toBe('PASSED');

    const resultArr = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      actualOutput: [1, 2, 3],
      config: { type: 'json' },
    });
    expect(resultArr.status).toBe('PASSED');
  });

  it('fails when parseStringOnly is true and output is already an object', () => {
    const result = evaluator.evaluate({
      caseId: 'test-5',
      input: 'prompt',
      actualOutput: { merchant: 'Store' },
      config: { type: 'json', parseStringOnly: true },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Expected string output containing JSON');
  });

  it('parses JSON wrapped in markdown code fences when stripCodeFences is true', () => {
    const fenced = '```json\n{"merchant": "Store", "amount": 10.5}\n```';
    const result = evaluator.evaluate({
      caseId: 'test-6',
      input: 'prompt',
      actualOutput: fenced,
      config: { type: 'json', stripCodeFences: true },
    });

    expect(result.status).toBe('PASSED');
    expect(result.actual).toEqual({ merchant: 'Store', amount: 10.5 });
  });

  it('fails on fenced JSON when stripCodeFences is false or omitted', () => {
    const fenced = '```json\n{"merchant": "Store"}\n```';
    const result = evaluator.evaluate({
      caseId: 'test-7',
      input: 'prompt',
      actualOutput: fenced,
      config: { type: 'json', stripCodeFences: false },
    });

    expect(result.status).toBe('FAILED');
  });
});
