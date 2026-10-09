import { ExactMatchEvaluator } from './exact-match.js';
import { RequiredContentEvaluator } from './required-content.js';
import { ProhibitedContentEvaluator } from './prohibited-content.js';
import { JsonValidEvaluator } from './json-valid.js';
import { JsonSchemaEvaluator } from './json-schema.js';
import { RequiredFieldsEvaluator } from './required-fields.js';
import { FieldTypesEvaluator } from './field-types.js';
import type { Evaluator } from './types.js';

export class EvaluatorRegistry {
  private evaluators = new Map<string, Evaluator<never>>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new ExactMatchEvaluator());
    this.register(new RequiredContentEvaluator());
    this.register(new ProhibitedContentEvaluator());
    this.register(new JsonValidEvaluator('json'));
    this.register(new JsonValidEvaluator('json_valid'));
    this.register(new JsonSchemaEvaluator());
    this.register(new RequiredFieldsEvaluator());
    this.register(new FieldTypesEvaluator());
  }

  public register<TConfig>(evaluator: Evaluator<TConfig>): void {
    if (!evaluator || typeof evaluator.type !== 'string' || evaluator.type.trim().length === 0) {
      throw new Error('Evaluator must have a non-empty string "type" property');
    }
    if (typeof evaluator.evaluate !== 'function') {
      throw new Error(`Evaluator for type "${evaluator.type}" must implement an "evaluate" method`);
    }
    this.evaluators.set(evaluator.type, evaluator as unknown as Evaluator<never>);
  }

  public get<TConfig = unknown>(type: string): Evaluator<TConfig> | undefined {
    return this.evaluators.get(type) as unknown as Evaluator<TConfig> | undefined;
  }

  public has(type: string): boolean {
    return this.evaluators.has(type);
  }

  public listRegisteredTypes(): string[] {
    return Array.from(this.evaluators.keys());
  }
}

/**
 * Shared default instance of EvaluatorRegistry.
 */
export const defaultEvaluatorRegistry = new EvaluatorRegistry();
