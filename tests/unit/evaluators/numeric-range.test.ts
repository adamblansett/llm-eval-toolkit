import { describe, it, expect } from 'vitest';
import { NumericRangeEvaluator } from '../../../src/evaluators/numeric-range.js';

describe('NumericRangeEvaluator', () => {
  const evaluator = new NumericRangeEvaluator();

  it('passes when value is within min and max boundaries', () => {
    const result = evaluator.evaluate({
      caseId: 'case-1',
      input: 'prompt',
      actualOutput: 42,
      config: { type: 'numeric_range', min: 0, max: 100 },
    });

    expect(result.status).toBe('PASSED');
    expect(result.actual).toBe(42);
  });

  it('fails when value is less than min', () => {
    const result = evaluator.evaluate({
      caseId: 'case-2',
      input: 'prompt',
      actualOutput: -5,
      config: { type: 'numeric_range', min: 0 },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('less than minimum allowed 0');
  });

  it('fails when value exceeds max', () => {
    const result = evaluator.evaluate({
      caseId: 'case-3',
      input: 'prompt',
      actualOutput: 105,
      config: { type: 'numeric_range', max: 100 },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('greater than maximum allowed 100');
  });

  it('evaluates expected value with tolerance', () => {
    const passing = evaluator.evaluate({
      caseId: 'case-4',
      input: 'prompt',
      actualOutput: 9.98,
      config: { type: 'numeric_range', expected: 10, tolerance: 0.05 },
    });
    expect(passing.status).toBe('PASSED');

    const failing = evaluator.evaluate({
      caseId: 'case-5',
      input: 'prompt',
      actualOutput: 10.15,
      config: { type: 'numeric_range', expected: 10, tolerance: 0.05 },
    });
    expect(failing.status).toBe('FAILED');
    expect(failing.message).toContain('differs from expected 10 by 0.15');
  });

  it('parses numeric values represented as strings', () => {
    const result = evaluator.evaluate({
      caseId: 'case-6',
      input: 'prompt',
      actualOutput: '3.14159',
      config: { type: 'numeric_range', min: 3.0, max: 4.0 },
    });

    expect(result.status).toBe('PASSED');
    expect(result.actual).toBe(3.14159);
  });

  it('evaluates nested property paths correctly', () => {
    const result = evaluator.evaluate({
      caseId: 'case-7',
      input: 'prompt',
      actualOutput: { metrics: { score: 85 } },
      config: { type: 'numeric_range', path: 'metrics.score', min: 80, max: 90 },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails when property path does not exist', () => {
    const result = evaluator.evaluate({
      caseId: 'case-8',
      input: 'prompt',
      actualOutput: { metrics: {} },
      config: { type: 'numeric_range', path: 'metrics.score', min: 80 },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('does not exist in output');
  });

  it('fails when output cannot be interpreted as a number', () => {
    const result = evaluator.evaluate({
      caseId: 'case-9',
      input: 'prompt',
      actualOutput: 'not a number',
      config: { type: 'numeric_range', min: 0 },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Expected numeric value');
  });
});
