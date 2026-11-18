import { describe, it, expect } from 'vitest';
import { RegexMatchEvaluator } from '../../../src/evaluators/regex-match.js';

describe('RegexMatchEvaluator', () => {
  const evaluator = new RegexMatchEvaluator();

  it('passes when output matches regular expression', () => {
    const result = evaluator.evaluate({
      caseId: 'case-1',
      input: 'prompt',
      actualOutput: 'Order #12345 confirmed',
      config: { type: 'regex_match', pattern: '^Order #\\d+ confirmed$' },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails when output does not match regular expression', () => {
    const result = evaluator.evaluate({
      caseId: 'case-2',
      input: 'prompt',
      actualOutput: 'Invalid status',
      config: { type: 'regex_match', pattern: '^Order #\\d+' },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('did not match pattern');
  });

  it('supports regex flags like case-insensitivity (i)', () => {
    const result = evaluator.evaluate({
      caseId: 'case-3',
      input: 'prompt',
      actualOutput: 'SUCCESS',
      config: { type: 'regex_match', pattern: 'success', flags: 'i' },
    });

    expect(result.status).toBe('PASSED');
  });

  it('supports inverted match to prohibit patterns', () => {
    const passing = evaluator.evaluate({
      caseId: 'case-4',
      input: 'prompt',
      actualOutput: 'System is healthy',
      config: { type: 'regex_match', pattern: 'FATAL|ERROR', invert: true },
    });
    expect(passing.status).toBe('PASSED');

    const failing = evaluator.evaluate({
      caseId: 'case-5',
      input: 'prompt',
      actualOutput: 'FATAL: database unavailable',
      config: { type: 'regex_match', pattern: 'FATAL|ERROR', invert: true },
    });
    expect(failing.status).toBe('FAILED');
    expect(failing.message).toContain('unexpectedly matched prohibited pattern');
  });

  it('uses custom error message when provided', () => {
    const result = evaluator.evaluate({
      caseId: 'case-6',
      input: 'prompt',
      actualOutput: 'bad response',
      config: {
        type: 'regex_match',
        pattern: '^good',
        message: 'Must start with good',
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toBe('Must start with good');
  });

  it('evaluates target at nested path', () => {
    const result = evaluator.evaluate({
      caseId: 'case-7',
      input: 'prompt',
      actualOutput: { user: { email: 'alice@example.com' } },
      config: { type: 'regex_match', path: 'user.email', pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' },
    });

    expect(result.status).toBe('PASSED');
  });

  it('returns ERROR when pattern is an invalid regular expression syntax', () => {
    const result = evaluator.evaluate({
      caseId: 'case-8',
      input: 'prompt',
      actualOutput: 'test',
      config: { type: 'regex_match', pattern: '[unclosed-bracket' },
    });

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Invalid regular expression pattern');
  });
});
