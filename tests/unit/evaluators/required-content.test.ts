import { describe, it, expect } from 'vitest';
import { RequiredContentEvaluator } from '../../../src/evaluators/required-content.js';

describe('RequiredContentEvaluator', () => {
  const evaluator = new RequiredContentEvaluator();

  it('passes when all required terms are present', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: 'The quick brown fox jumps over the lazy dog',
      config: {
        type: 'required_content',
        terms: ['fox', 'dog'],
      },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('all 2 required term(s)');
  });

  it('fails and identifies missing terms', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: 'The quick brown fox jumps',
      config: {
        type: 'required_content',
        terms: ['fox', 'elephant', 'bear'],
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('missing 2 required term(s)');
    expect(result.message).toContain('"elephant"');
    expect(result.message).toContain('"bear"');
  });

  it('supports single string term in config', () => {
    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: 'Order confirmed',
      config: {
        type: 'required_content',
        terms: 'confirmed',
      },
    });

    expect(result.status).toBe('PASSED');
  });

  it('respects ignoreCase option', () => {
    const result = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      actualOutput: 'TOTAL: $50.00',
      config: {
        type: 'required_content',
        terms: ['total'],
        ignoreCase: true,
      },
    });

    expect(result.status).toBe('PASSED');
  });

  it('returns ERROR if no terms are configured', () => {
    const result = evaluator.evaluate({
      caseId: 'test-5',
      input: 'prompt',
      actualOutput: 'some text',
      config: {
        type: 'required_content',
        terms: [],
      },
    });

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('No required terms specified');
  });

  it('searches inside stringified objects if output is not a string', () => {
    const result = evaluator.evaluate({
      caseId: 'test-6',
      input: 'prompt',
      actualOutput: { status: 'approved', id: 123 },
      config: {
        type: 'required_content',
        terms: ['approved'],
      },
    });

    expect(result.status).toBe('PASSED');
  });
});
