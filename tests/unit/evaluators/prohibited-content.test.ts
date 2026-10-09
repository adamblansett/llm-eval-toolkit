import { describe, it, expect } from 'vitest';
import { ProhibitedContentEvaluator } from '../../../src/evaluators/prohibited-content.js';

describe('ProhibitedContentEvaluator', () => {
  const evaluator = new ProhibitedContentEvaluator();

  it('passes when output contains no prohibited terms', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: 'The transaction was processed normally.',
      config: {
        type: 'prohibited_content',
        terms: ['sk_live_', 'api_key', 'password'],
      },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('contains no prohibited content');
  });

  it('fails and identifies the prohibited term found', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: 'Debug token: sk_live_1234567890abcdef',
      config: {
        type: 'prohibited_content',
        terms: ['sk_live_', 'secret_token'],
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('prohibited term(s): "sk_live_"');
    // Does not leak the full token or unrelated payload in the message
    expect(result.message).not.toContain('1234567890abcdef');
  });

  it('respects ignoreCase option', () => {
    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: 'CONFIDENTIAL DOCUMENT',
      config: {
        type: 'prohibited_content',
        terms: ['confidential'],
        ignoreCase: true,
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('"confidential"');
  });

  it('returns ERROR when no terms are configured', () => {
    const result = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      actualOutput: 'some text',
      config: {
        type: 'prohibited_content',
        terms: [],
      },
    });

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('No prohibited terms specified');
  });
});
