import { deepEqual } from '../utils/equality.js';
import { safePreview } from '../utils/sanitizer.js';
import type { ExactMatchAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export class ExactMatchEvaluator implements Evaluator<ExactMatchAssertionConfig> {
  public readonly type = 'exact_match';

  public evaluate(context: EvaluationContext<ExactMatchAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;

    const expected = config.expected !== undefined ? config.expected : context.expected;
    if (expected === undefined) {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No expected value specified in assertion config or case',
        durationMs: performance.now() - start,
      };
    }

    const actual = context.actualOutput;

    // Check if both are strings and string transformation flags are enabled
    if (typeof expected === 'string' && typeof actual === 'string') {
      let expStr = expected;
      let actStr = actual;

      if (config.normalizeNewlines) {
        expStr = expStr.replace(/\r\n/g, '\n');
        actStr = actStr.replace(/\r\n/g, '\n');
      }
      if (config.trimWhitespace) {
        expStr = expStr.trim();
        actStr = actStr.trim();
      }
      if (config.ignoreCase) {
        expStr = expStr.toLowerCase();
        actStr = actStr.toLowerCase();
      }

      const passed = expStr === actStr;
      return {
        assertionType: this.type,
        status: passed ? 'PASSED' : 'FAILED',
        message: passed
          ? 'Output exactly matches expected string'
          : `Output does not match expected string: received ${safePreview(actual)} (expected ${safePreview(expected)})`,
        expected,
        actual,
        durationMs: performance.now() - start,
      };
    }

    const passed = deepEqual(actual, expected);

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? 'Output matches expected value'
        : `Output does not match expected value: received ${safePreview(actual)} (expected ${safePreview(expected)})`,
      expected,
      actual,
      durationMs: performance.now() - start,
    };
  }
}
