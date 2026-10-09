import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { JsonSchemaAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export class JsonSchemaEvaluator implements Evaluator<JsonSchemaAssertionConfig> {
  public readonly type = 'json_schema';
  private ajv: Ajv;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AjvClass: any = (Ajv as any).default ?? Ajv;
    this.ajv = new AjvClass({
      allErrors: true,
      strict: false,
    });
    // @ts-expect-error ajv-formats typing compatibility
    addFormats(this.ajv);
  }

  public evaluate(context: EvaluationContext<JsonSchemaAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;

    if (!config?.schema || typeof config.schema !== 'object') {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No valid JSON Schema provided in assertion config',
        durationMs: performance.now() - start,
      };
    }

    let parsedOutput = context.actualOutput;

    if (typeof parsedOutput === 'string') {
      try {
        parsedOutput = JSON.parse(parsedOutput);
      } catch (err: unknown) {
        const error = err as Error;
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Cannot validate schema: output string is not valid JSON (${error.message})`,
          diagnostics: {
            parseError: error.message,
          },
          durationMs: performance.now() - start,
        };
      }
    }

    let validateFn: ValidateFunction;
    try {
      validateFn = this.ajv.compile(config.schema);
    } catch (err: unknown) {
      const error = err as Error;
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: `Invalid JSON Schema definition: ${error.message}`,
        durationMs: performance.now() - start,
      };
    }

    let isValid = false;
    try {
      isValid = Boolean(validateFn(parsedOutput));
    } catch (err: unknown) {
      const error = err as Error;
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: `Schema validation execution failed: ${error.message}`,
        durationMs: performance.now() - start,
      };
    }

    if (isValid) {
      return {
        assertionType: this.type,
        status: 'PASSED',
        message: 'Output satisfies JSON Schema',
        actual: parsedOutput,
        durationMs: performance.now() - start,
      };
    }

    const errors = (validateFn.errors ?? []).map((err: ErrorObject) => ({
      instancePath: err.instancePath || '/',
      schemaPath: err.schemaPath,
      keyword: err.keyword,
      message: err.message ?? 'Unknown validation error',
      params: err.params,
    }));

    const formattedIssues = errors
      .slice(0, 5)
      .map((e: { instancePath: string; message: string }) => `at "${e.instancePath}": ${e.message}`)
      .join('; ');

    const extra = errors.length > 5 ? ` (+${errors.length - 5} more)` : '';

    return {
      assertionType: this.type,
      status: 'FAILED',
      message: `Output failed JSON Schema validation (${errors.length} issue(s)): ${formattedIssues}${extra}`,
      diagnostics: {
        errors,
      },
      actual: parsedOutput,
      durationMs: performance.now() - start,
    };
  }
}
