import { getValueByPath } from '../utils/property-path.js';
import type { RequiredFieldsAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export class RequiredFieldsEvaluator implements Evaluator<RequiredFieldsAssertionConfig> {
  public readonly type = 'required_fields';

  public evaluate(context: EvaluationContext<RequiredFieldsAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;
    const fields = config?.fields ?? [];

    if (!Array.isArray(fields) || fields.length === 0) {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No fields specified in required_fields assertion config',
        durationMs: performance.now() - start,
      };
    }

    let target = context.actualOutput;
    if (typeof target === 'string') {
      try {
        target = JSON.parse(target);
      } catch (err: unknown) {
        const error = err as Error;
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Cannot check required fields: output string is not valid JSON (${error.message})`,
          durationMs: performance.now() - start,
        };
      }
    }

    if (target === null || typeof target !== 'object') {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Expected structured object or array, received type "${typeof target}"`,
        durationMs: performance.now() - start,
      };
    }

    const missingFields: string[] = [];

    for (const field of fields) {
      const lookup = getValueByPath(target, field);
      if (!lookup.found || lookup.value === undefined) {
        missingFields.push(field);
      }
    }

    const passed = missingFields.length === 0;

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? `All ${fields.length} required field(s) are present`
        : `Missing required field(s): ${missingFields.map((f) => `"${f}"`).join(', ')}`,
      expected: fields,
      diagnostics: {
        missingFields,
        checkedFields: fields,
      },
      durationMs: performance.now() - start,
    };
  }
}
