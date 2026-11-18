import { describe, it, expect } from 'vitest';
import { JsonSchemaEvaluator } from '../../../src/evaluators/json-schema.js';

describe('JsonSchemaEvaluator', () => {
  const evaluator = new JsonSchemaEvaluator();

  const testSchema = {
    type: 'object',
    required: ['id', 'score'],
    properties: {
      id: { type: 'string' },
      score: { type: 'number', minimum: 0, maximum: 100 },
    },
    additionalProperties: false,
  };

  it('passes when output matches schema', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: { id: 'abc', score: 95 },
      config: { type: 'json_schema', schema: testSchema },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('satisfies JSON Schema');
  });

  it('parses raw JSON string and validates successfully', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: '{"id": "xyz", "score": 80}',
      config: { type: 'json_schema', schema: testSchema },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails and reports detailed schema issues on violations', () => {
    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: { id: 'abc', score: -5, extraField: true },
      config: { type: 'json_schema', schema: testSchema },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Output failed JSON Schema validation');
    expect(result.message).toContain('must be >= 0');
    expect(result.diagnostics?.errors).toBeDefined();
  });

  it('fails gracefully when output string is malformed JSON', () => {
    const result = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      actualOutput: '{ not json }',
      config: { type: 'json_schema', schema: testSchema },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('output string is not valid JSON');
  });

  it('returns ERROR when schema is invalid', () => {
    const result = evaluator.evaluate({
      caseId: 'test-5',
      input: 'prompt',
      actualOutput: { id: 'test' },
      // Invalid schema type
      config: {
        type: 'json_schema',
        schema: { type: 'unsupported-type-xyz' } as Record<string, unknown>,
      },
    });

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Invalid JSON Schema definition');
  });

  it('validates schema on fenced JSON when stripCodeFences is true', () => {
    const fenced = '```json\n{"id": "fenced-1", "score": 90}\n```';
    const result = evaluator.evaluate({
      caseId: 'test-6',
      input: 'prompt',
      actualOutput: fenced,
      config: { type: 'json_schema', schema: testSchema, stripCodeFences: true },
    });

    expect(result.status).toBe('PASSED');
  });
});
