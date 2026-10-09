import { describe, it, expect } from 'vitest';
import { RequiredFieldsEvaluator } from '../../../src/evaluators/required-fields.js';

describe('RequiredFieldsEvaluator', () => {
  const evaluator = new RequiredFieldsEvaluator();

  it('passes when all required top-level fields are present', () => {
    const result = evaluator.evaluate({
      caseId: 'test-1',
      input: 'prompt',
      actualOutput: { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      config: { type: 'required_fields', fields: ['name', 'email'] },
    });

    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('All 2 required field(s) are present');
  });

  it('supports nested property paths', () => {
    const result = evaluator.evaluate({
      caseId: 'test-2',
      input: 'prompt',
      actualOutput: {
        user: {
          address: { city: 'Seattle', zip: '98101' },
          items: [{ sku: '123' }],
        },
      },
      config: {
        type: 'required_fields',
        fields: ['user.address.city', 'user.items[0].sku'],
      },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails and identifies missing fields', () => {
    const result = evaluator.evaluate({
      caseId: 'test-3',
      input: 'prompt',
      actualOutput: { name: 'Alice' },
      config: { type: 'required_fields', fields: ['name', 'phone', 'address.zip'] },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Missing required field(s): "phone", "address.zip"');
    expect(result.diagnostics?.missingFields).toEqual(['phone', 'address.zip']);
  });

  it('parses JSON string output before evaluating', () => {
    const result = evaluator.evaluate({
      caseId: 'test-4',
      input: 'prompt',
      actualOutput: '{"merchant": "Store", "amount": 25}',
      config: { type: 'required_fields', fields: ['merchant', 'amount'] },
    });

    expect(result.status).toBe('PASSED');
  });

  it('fails cleanly on malformed JSON string output', () => {
    const result = evaluator.evaluate({
      caseId: 'test-5',
      input: 'prompt',
      actualOutput: '{ invalid }',
      config: { type: 'required_fields', fields: ['merchant'] },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('output string is not valid JSON');
  });
});
