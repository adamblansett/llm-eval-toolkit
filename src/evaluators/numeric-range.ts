import type { NumericRangeAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';
import { getValueByPath } from '../utils/property-path.js';

export class NumericRangeEvaluator implements Evaluator<NumericRangeAssertionConfig> {
  public readonly type: string;

  constructor(type = 'numeric_range') {
    this.type = type;
  }

  public evaluate(context: EvaluationContext<NumericRangeAssertionConfig>): AssertionResult {
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

    let num: number;
    if (typeof targetValue === 'number') {
      num = targetValue;
    } else if (
      typeof targetValue === 'string' &&
      targetValue.trim().length > 0 &&
      !Number.isNaN(Number(targetValue))
    ) {
      num = Number(targetValue);
    } else {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Expected numeric value${pathDesc}, but received "${typeof targetValue}" (${String(targetValue)})`,
        durationMs: performance.now() - start,
      };
    }

    if (Number.isNaN(num)) {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Value${pathDesc} is NaN`,
        durationMs: performance.now() - start,
      };
    }

    const issues: string[] = [];

    if (config.min !== undefined && num < config.min) {
      issues.push(`value ${num} is less than minimum allowed ${config.min}`);
    }

    if (config.max !== undefined && num > config.max) {
      issues.push(`value ${num} is greater than maximum allowed ${config.max}`);
    }

    if (config.expected !== undefined) {
      const tolerance = config.tolerance ?? 0;
      const diff = Math.abs(num - config.expected);
      if (diff > tolerance) {
        issues.push(
          `value ${num} differs from expected ${config.expected} by ${diff} (allowed tolerance: ±${tolerance})`,
        );
      }
    }

    if (issues.length > 0) {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Numeric constraint failed${pathDesc}: ${issues.join('; ')}`,
        expected: {
          min: config.min,
          max: config.max,
          expected: config.expected,
          tolerance: config.tolerance,
        },
        actual: num,
        diagnostics: {
          value: num,
          issues,
        },
        durationMs: performance.now() - start,
      };
    }

    return {
      assertionType: this.type,
      status: 'PASSED',
      message: `Numeric value ${num}${pathDesc} satisfies range/tolerance constraints`,
      actual: num,
      durationMs: performance.now() - start,
    };
  }
}
