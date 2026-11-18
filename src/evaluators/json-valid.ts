import type { JsonValidAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';
import { stripCodeFences } from '../utils/markdown.js';

export class JsonValidEvaluator implements Evaluator<JsonValidAssertionConfig> {
  public readonly type: string;

  constructor(type = 'json') {
    this.type = type;
  }

  public evaluate(context: EvaluationContext<JsonValidAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;
    let actual = context.actualOutput;

    if (config?.stripCodeFences && typeof actual === 'string') {
      actual = stripCodeFences(actual);
    }

    if (config?.parseStringOnly) {
      if (typeof actual !== 'string') {
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Expected string output containing JSON, but received type "${typeof actual}"`,
          durationMs: performance.now() - start,
        };
      }
    }

    if (typeof actual === 'string') {
      try {
        const parsed = JSON.parse(actual);
        return {
          assertionType: this.type,
          status: 'PASSED',
          message: 'Output contains valid JSON',
          actual: parsed,
          durationMs: performance.now() - start,
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Output is not valid JSON: ${error.message}`,
          diagnostics: {
            parseError: error.message,
          },
          durationMs: performance.now() - start,
        };
      }
    }

    // Already-parsed values (object, array, number, boolean, null)
    if (
      actual === null ||
      typeof actual === 'object' ||
      typeof actual === 'number' ||
      typeof actual === 'boolean'
    ) {
      return {
        assertionType: this.type,
        status: 'PASSED',
        message: 'Output is already a valid JSON structure or primitive',
        actual,
        durationMs: performance.now() - start,
      };
    }

    return {
      assertionType: this.type,
      status: 'FAILED',
      message: `Output cannot be represented as JSON (type: ${typeof actual})`,
      durationMs: performance.now() - start,
    };
  }
}
