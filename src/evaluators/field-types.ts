import { getValueByPath } from '../utils/property-path.js';
import type { FieldTypesAssertionConfig, SupportedFieldType } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export function getActualType(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'number') {
    return Number.isFinite(val) ? 'number' : 'NaN/Infinity';
  }
  return typeof val;
}

export function matchesExpectedType(val: unknown, expectedType: SupportedFieldType): boolean {
  switch (expectedType) {
    case 'string':
      return typeof val === 'string';
    case 'number':
      return typeof val === 'number' && Number.isFinite(val);
    case 'boolean':
      return typeof val === 'boolean';
    case 'array':
      return Array.isArray(val);
    case 'object':
      return typeof val === 'object' && val !== null && !Array.isArray(val);
    case 'null':
      return val === null;
    default:
      return false;
  }
}

export class FieldTypesEvaluator implements Evaluator<FieldTypesAssertionConfig> {
  public readonly type = 'field_types';

  public evaluate(context: EvaluationContext<FieldTypesAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;
    const typeMap = config?.types ?? {};

    const paths = Object.keys(typeMap);
    if (paths.length === 0) {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No types specified in field_types assertion config',
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
          message: `Cannot check field types: output string is not valid JSON (${error.message})`,
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

    const typeMismatches: Array<{
      path: string;
      expected: SupportedFieldType;
      actual: string;
      missing: boolean;
    }> = [];

    for (const path of paths) {
      const expectedType = typeMap[path];
      if (!expectedType) continue;

      const lookup = getValueByPath(target, path);
      if (!lookup.found || lookup.value === undefined) {
        typeMismatches.push({
          path,
          expected: expectedType,
          actual: 'missing',
          missing: true,
        });
      } else if (!matchesExpectedType(lookup.value, expectedType)) {
        typeMismatches.push({
          path,
          expected: expectedType,
          actual: getActualType(lookup.value),
          missing: false,
        });
      }
    }

    const passed = typeMismatches.length === 0;

    const formattedIssues = typeMismatches
      .map((m) =>
        m.missing
          ? `field "${m.path}" is missing (expected "${m.expected}")`
          : `field "${m.path}" expected "${m.expected}", got "${m.actual}"`,
      )
      .join('; ');

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? `All ${paths.length} field type check(s) passed`
        : `Field type check failed for ${typeMismatches.length} field(s): ${formattedIssues}`,
      expected: typeMap,
      diagnostics: {
        mismatches: typeMismatches,
        totalChecked: paths.length,
      },
      durationMs: performance.now() - start,
    };
  }
}
