import type { RegexMatchAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';
import { getValueByPath } from '../utils/property-path.js';
import { safePreview } from '../utils/sanitizer.js';

export class RegexMatchEvaluator implements Evaluator<RegexMatchAssertionConfig> {
  public readonly type: string;

  constructor(type = 'regex_match') {
    this.type = type;
  }

  public evaluate(context: EvaluationContext<RegexMatchAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;

    let targetValue: unknown = context.actualOutput;
    const pathDesc = config.path ? ` at path "${config.path}"` : '';

    if (config.path) {
      const lookup = getValueByPath(context.actualOutput, config.path);
      if (!lookup.found) {
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Field${pathDesc} does not exist in output`,
          durationMs: performance.now() - start,
        };
      }
      targetValue = lookup.value;
    }

    if (targetValue === null || targetValue === undefined) {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Expected string value${pathDesc}, but received ${String(targetValue)}`,
        durationMs: performance.now() - start,
      };
    }

    const textToMatch = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue);

    let regex: RegExp;
    try {
      regex = new RegExp(config.pattern, config.flags);
    } catch (err: unknown) {
      const error = err as Error;
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: `Invalid regular expression pattern "${config.pattern}": ${error.message}`,
        durationMs: performance.now() - start,
      };
    }

    const matches = regex.test(textToMatch);
    const invert = Boolean(config.invert);
    const passed = invert ? !matches : matches;

    if (!passed) {
      const defaultMsg = invert
        ? `Output${pathDesc} unexpectedly matched prohibited pattern /${config.pattern}/${config.flags ?? ''}`
        : `Output${pathDesc} did not match pattern /${config.pattern}/${config.flags ?? ''}: received ${safePreview(textToMatch)}`;

      return {
        assertionType: this.type,
        status: 'FAILED',
        message: config.message ?? defaultMsg,
        expected: invert ? `Not matching /${config.pattern}/` : `Matching /${config.pattern}/`,
        actual: safePreview(textToMatch),
        diagnostics: {
          pattern: config.pattern,
          flags: config.flags,
          invert,
        },
        durationMs: performance.now() - start,
      };
    }

    return {
      assertionType: this.type,
      status: 'PASSED',
      message: invert
        ? `Output${pathDesc} correctly did not match prohibited pattern /${config.pattern}/`
        : `Output${pathDesc} matched pattern /${config.pattern}/${config.flags ?? ''}`,
      actual: safePreview(textToMatch),
      durationMs: performance.now() - start,
    };
  }
}
