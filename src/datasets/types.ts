/**
 * Supported built-in assertion types.
 */
export type BuiltinAssertionType =
  | 'exact_match'
  | 'required_content'
  | 'prohibited_content'
  | 'json'
  | 'json_valid'
  | 'json_schema'
  | 'required_fields'
  | 'field_types'
  | 'numeric_range'
  | 'numeric'
  | 'regex_match'
  | 'regex'
  | 'similarity'
  | 'levenshtein';

export interface ExactMatchAssertionConfig {
  type: 'exact_match';
  expected?: unknown;
  ignoreCase?: boolean;
  trimWhitespace?: boolean;
  normalizeNewlines?: boolean;
}

export interface RequiredContentAssertionConfig {
  type: 'required_content';
  terms: string[] | string;
  ignoreCase?: boolean;
}

export interface ProhibitedContentAssertionConfig {
  type: 'prohibited_content';
  terms: string[] | string;
  ignoreCase?: boolean;
}

export interface JsonValidAssertionConfig {
  type: 'json' | 'json_valid';
  parseStringOnly?: boolean;
  stripCodeFences?: boolean;
}

export interface JsonSchemaAssertionConfig {
  type: 'json_schema';
  schema: Record<string, unknown>;
  stripCodeFences?: boolean;
}

export interface RequiredFieldsAssertionConfig {
  type: 'required_fields';
  fields: string[];
}

export type SupportedFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

export interface FieldTypesAssertionConfig {
  type: 'field_types';
  types: Record<string, SupportedFieldType>;
}

export interface NumericRangeAssertionConfig {
  type: 'numeric_range' | 'numeric';
  min?: number;
  max?: number;
  expected?: number;
  tolerance?: number;
  path?: string;
}

export interface RegexMatchAssertionConfig {
  type: 'regex_match' | 'regex';
  pattern: string;
  flags?: string;
  path?: string;
  invert?: boolean;
  message?: string;
}

export interface SimilarityAssertionConfig {
  type: 'similarity' | 'levenshtein';
  expected: string;
  minThreshold: number;
  algorithm?: 'levenshtein' | 'jaccard';
  ignoreCase?: boolean;
  trimWhitespace?: boolean;
  path?: string;
}

export interface CustomAssertionConfig {
  type: string;
  [key: string]: unknown;
}

export type AssertionConfig =
  | ExactMatchAssertionConfig
  | RequiredContentAssertionConfig
  | ProhibitedContentAssertionConfig
  | JsonValidAssertionConfig
  | JsonSchemaAssertionConfig
  | RequiredFieldsAssertionConfig
  | FieldTypesAssertionConfig
  | NumericRangeAssertionConfig
  | RegexMatchAssertionConfig
  | SimilarityAssertionConfig
  | CustomAssertionConfig;

export interface EvaluationCase {
  id: string;
  description?: string;
  tags?: string[];
  input: unknown;
  expected?: unknown;
  assertions: AssertionConfig[];
  metadata?: Record<string, unknown>;
}

export interface EvaluationDataset {
  version: number;
  name: string;
  description?: string;
  cases: EvaluationCase[];
  metadata?: Record<string, unknown>;
}

/**
 * Output fixtures mapping case ID to raw or parsed output.
 */
export type OutputMap = Record<string, unknown>;

export interface OutputFixtureFile {
  version?: number;
  outputs?: OutputMap;
  cases?: Array<{ id: string; output: unknown }>;
  [caseId: string]: unknown;
}
