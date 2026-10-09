import { describe, it, expect } from 'vitest';
import { EvaluatorRegistry } from '../../../src/evaluators/registry.js';
import type {
  Evaluator,
  EvaluationContext,
  AssertionResult,
} from '../../../src/evaluators/types.js';

describe('EvaluatorRegistry', () => {
  it('registers all built-in evaluators by default', () => {
    const registry = new EvaluatorRegistry();
    expect(registry.has('exact_match')).toBe(true);
    expect(registry.has('required_content')).toBe(true);
    expect(registry.has('prohibited_content')).toBe(true);
    expect(registry.has('json')).toBe(true);
    expect(registry.has('json_valid')).toBe(true);
    expect(registry.has('json_schema')).toBe(true);
    expect(registry.has('required_fields')).toBe(true);
    expect(registry.has('field_types')).toBe(true);
  });

  it('allows registering and retrieving custom evaluators', async () => {
    const registry = new EvaluatorRegistry();

    const customEvaluator: Evaluator<{ minWordCount: number }> = {
      type: 'min_word_count',
      evaluate(ctx: EvaluationContext<{ minWordCount: number }>): AssertionResult {
        const text = String(ctx.actualOutput);
        const count = text.split(/\s+/).filter(Boolean).length;
        const passed = count >= ctx.config.minWordCount;
        return {
          assertionType: 'min_word_count',
          status: passed ? 'PASSED' : 'FAILED',
          message: passed
            ? `Word count ${count} >= ${ctx.config.minWordCount}`
            : `Word count ${count} < ${ctx.config.minWordCount}`,
        };
      },
    };

    registry.register(customEvaluator);
    expect(registry.has('min_word_count')).toBe(true);
    const retrieved = registry.get<{ minWordCount: number }>('min_word_count');
    expect(retrieved).toBe(customEvaluator);

    const result = await Promise.resolve(
      retrieved?.evaluate({
        caseId: 'custom-1',
        input: 'prompt',
        actualOutput: 'one two three four five',
        config: { minWordCount: 3 },
      }),
    );

    expect(result?.status).toBe('PASSED');
  });

  it('rejects invalid evaluators without type or evaluate method', () => {
    const registry = new EvaluatorRegistry();

    // @ts-expect-error invalid evaluator testing
    expect(() => registry.register(null)).toThrow(/non-empty string "type"/);
    // @ts-expect-error invalid evaluator testing
    expect(() => registry.register({ type: '' })).toThrow(/non-empty string "type"/);
    // @ts-expect-error invalid evaluator testing
    expect(() => registry.register({ type: 'invalid' })).toThrow(/implement an "evaluate" method/);
  });
});
