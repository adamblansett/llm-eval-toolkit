import { describe, it, expect } from 'vitest';
import { FieldTypesEvaluator } from '../../../src/evaluators/field-types.js';

describe('FieldTypesEvaluator', () => {
  const evaluator = new FieldTypesEvaluator();

  it('passes when all field types match correctly', () => {
    const output = {
      str: 'hello',
      num: 42,
      bool: true,
      arr: [1, 2],
      obj: { key: 'val' },
      nil: null,
    };

    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: output,
      config: {
        type: 'field_types',
        types: {
          str: 'string',
          num: 'number',
          bool: 'boolean',
          arr: 'array',
          obj: 'object',
          nil: 'null',
        },
      },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('All 6 field type check(s) passed');
  });

  it('fails on type mismatches and missing fields', () => {
    const output = {
      str: 123, // expected string
      num: '42', // expected number
      arr: { not: 'array' }, // expected array
    };

    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: output,
      config: {
        type: 'field_types',
        types: {
          str: 'string',
          num: 'number',
          arr: 'array',
          missingField: 'boolean',
        },
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Field type check failed for 4 field(s)');
    expect(result.message).toContain('field "str" expected "string", got "number"');
    expect(result.message).toContain('field "num" expected "number", got "string"');
    expect(result.message).toContain('field "arr" expected "array", got "object"');
    expect(result.message).toContain('field "missingField" is missing (expected "boolean")');
  });

  it('evaluates nested field paths', () => {
    const output = {
      user: {
        age: 28,
        tags: ['admin', 'verified'],
      },
    };

    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: output,
      config: {
        type: 'field_types',
        types: {
          'user.age': 'number',
          'user.tags': 'array',
        },
      },
    });

    expect(result.status).toBe('PASSED');
  });
});
