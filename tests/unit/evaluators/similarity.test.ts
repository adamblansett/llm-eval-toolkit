import { describe, it, expect } from 'vitest';
import { SimilarityEvaluator } from '../../../src/evaluators/similarity.js';

describe('SimilarityEvaluator', () => {
  const evaluator = new SimilarityEvaluator();

  it('passes when Levenshtein similarity exceeds minThreshold', () => {
    const result = evaluator.evaluate({
      caseId: 'case-1',
      input: 'prompt',
      actualOutput: 'The quick brown fox jumps over the lazy dog',
      config: {
        type: 'similarity',
        expected: 'The quick brown fox jumps over the lazy dogs',
        minThreshold: 0.9,
      },
    });

    expect(result.status).toBe('PASSED');
    expect(result.diagnostics?.score).toBeGreaterThanOrEqual(0.9);
  });

  it('fails when Levenshtein similarity is below minThreshold', () => {
    const result = evaluator.evaluate({
      caseId: 'case-2',
      input: 'prompt',
      actualOutput: 'Completely different text content',
      config: {
        type: 'similarity',
        expected: 'The quick brown fox',
        minThreshold: 0.8,
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('is below minimum threshold');
  });

  it('evaluates Jaccard token similarity when algorithm is specified', () => {
    const result = evaluator.evaluate({
      caseId: 'case-3',
      input: 'prompt',
      actualOutput: 'red blue green',
      config: {
        type: 'similarity',
        algorithm: 'jaccard',
        expected: 'green red blue',
        minThreshold: 1.0,
      },
    });

    expect(result.status).toBe('PASSED');
    expect(result.diagnostics?.score).toBe(1.0);
    expect(result.diagnostics?.algorithm).toBe('jaccard');
  });

  it('supports ignoreCase and trimWhitespace options', () => {
    const result = evaluator.evaluate({
      caseId: 'case-4',
      input: 'prompt',
      actualOutput: '  HELLO WORLD  ',
      config: {
        type: 'similarity',
        expected: 'hello world',
        ignoreCase: true,
        trimWhitespace: true,
        minThreshold: 1.0,
      },
    });

    expect(result.status).toBe('PASSED');
  });

  it('evaluates property at target path', () => {
    const result = evaluator.evaluate({
      caseId: 'case-5',
      input: 'prompt',
      actualOutput: { summary: 'Quarterly financial report 2026' },
      config: {
        type: 'similarity',
        path: 'summary',
        expected: 'Quarterly financial report 2025',
        minThreshold: 0.9,
      },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails when path does not exist', () => {
    const result = evaluator.evaluate({
      caseId: 'case-6',
      input: 'prompt',
      actualOutput: {},
      config: {
        type: 'similarity',
        path: 'missing.field',
        expected: 'text',
        minThreshold: 0.5,
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('does not exist in output');
  });
});
