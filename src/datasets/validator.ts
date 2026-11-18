import { z } from 'zod';
import { SUPPORTED_DATASET_VERSION } from '../config/constants.js';
import type { EvaluationDataset, BuiltinAssertionType } from './types.js';

export const BUILTIN_ASSERTION_TYPES: readonly BuiltinAssertionType[] = [
  'exact_match',
  'required_content',
  'prohibited_content',
  'json',
  'json_valid',
  'json_schema',
  'required_fields',
  'field_types',
  'numeric_range',
  'numeric',
  'regex_match',
  'regex',
  'similarity',
  'levenshtein',
] as const;

const ExactMatchSchema = z
  .object({
    type: z.literal('exact_match'),
    expected: z.unknown().optional(),
    ignoreCase: z.boolean().optional(),
    trimWhitespace: z.boolean().optional(),
    normalizeNewlines: z.boolean().optional(),
  })
  .strict();

const RequiredContentSchema = z
  .object({
    type: z.literal('required_content'),
    terms: z.union([
      z.string().min(1, 'Required term string cannot be empty'),
      z
        .array(z.string().min(1, 'Required term cannot be empty'))
        .min(1, 'Must provide at least one required term'),
    ]),
    ignoreCase: z.boolean().optional(),
  })
  .strict();

const ProhibitedContentSchema = z
  .object({
    type: z.literal('prohibited_content'),
    terms: z.union([
      z.string().min(1, 'Prohibited term string cannot be empty'),
      z
        .array(z.string().min(1, 'Prohibited term cannot be empty'))
        .min(1, 'Must provide at least one prohibited term'),
    ]),
    ignoreCase: z.boolean().optional(),
  })
  .strict();

const JsonValidSchema = z
  .object({
    type: z.union([z.literal('json'), z.literal('json_valid')]),
    parseStringOnly: z.boolean().optional(),
    stripCodeFences: z.boolean().optional(),
  })
  .strict();

const JsonSchemaSchema = z
  .object({
    type: z.literal('json_schema'),
    schema: z
      .record(z.string(), z.unknown())
      .refine((val) => Object.keys(val).length > 0, 'JSON Schema must not be an empty object'),
    stripCodeFences: z.boolean().optional(),
  })
  .strict();

const RequiredFieldsSchema = z
  .object({
    type: z.literal('required_fields'),
    fields: z
      .array(z.string().min(1, 'Field name cannot be empty'))
      .min(1, 'Must provide at least one required field'),
  })
  .strict();

const SupportedFieldTypeEnum = z.enum(['string', 'number', 'boolean', 'array', 'object', 'null']);

const FieldTypesSchema = z
  .object({
    type: z.literal('field_types'),
    types: z
      .record(z.string(), SupportedFieldTypeEnum)
      .refine((val) => Object.keys(val).length > 0, 'Must specify at least one field type'),
  })
  .strict();

const NumericRangeSchema = z
  .object({
    type: z.union([z.literal('numeric_range'), z.literal('numeric')]),
    min: z.number().optional(),
    max: z.number().optional(),
    expected: z.number().optional(),
    tolerance: z.number().nonnegative('Tolerance must be non-negative').optional(),
    path: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => data.min !== undefined || data.max !== undefined || data.expected !== undefined,
    'numeric_range requires at least one of "min", "max", or "expected"',
  );

const RegexMatchSchema = z
  .object({
    type: z.union([z.literal('regex_match'), z.literal('regex')]),
    pattern: z.string().min(1, 'Pattern cannot be empty'),
    flags: z.string().optional(),
    path: z.string().optional(),
    invert: z.boolean().optional(),
    message: z.string().optional(),
  })
  .strict();

const SimilaritySchema = z
  .object({
    type: z.union([z.literal('similarity'), z.literal('levenshtein')]),
    expected: z.string(),
    minThreshold: z.number().min(0).max(1, 'Threshold must be between 0 and 1'),
    algorithm: z.enum(['levenshtein', 'jaccard']).optional(),
    ignoreCase: z.boolean().optional(),
    trimWhitespace: z.boolean().optional(),
    path: z.string().optional(),
  })
  .strict();

export interface ValidateDatasetOptions {
  knownCustomTypes?: string[];
}

export class DatasetValidationError extends Error {
  public readonly issues: Array<{ path: string; message: string; caseId?: string }>;

  constructor(message: string, issues: Array<{ path: string; message: string; caseId?: string }>) {
    super(message);
    this.name = 'DatasetValidationError';
    this.issues = issues;
  }
}

/**
 * Validates an unverified object against the EvaluationDataset specification.
 */
export function validateDataset(raw: unknown, options?: ValidateDatasetOptions): EvaluationDataset {
  const issues: Array<{ path: string; message: string; caseId?: string }> = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new DatasetValidationError('Dataset must be a JSON object', [
      { path: '', message: 'Expected JSON object root' },
    ]);
  }

  const rawObj = raw as Record<string, unknown>;

  // Check unexpected properties at dataset root
  const KNOWN_DATASET_KEYS = new Set(['version', 'name', 'description', 'cases', 'metadata']);
  for (const key of Object.keys(rawObj)) {
    if (!KNOWN_DATASET_KEYS.has(key)) {
      issues.push({
        path: key,
        message: `Unexpected property "${key}" at dataset root. Custom fields should be placed inside "metadata".`,
      });
    }
  }

  // 1. Version validation
  if (rawObj['version'] === undefined) {
    issues.push({ path: 'version', message: 'Missing required "version" field' });
  } else if (typeof rawObj['version'] !== 'number' || !Number.isInteger(rawObj['version'])) {
    issues.push({
      path: 'version',
      message: `Expected "version" to be an integer, got ${typeof rawObj['version']}`,
    });
  } else if (rawObj['version'] !== SUPPORTED_DATASET_VERSION) {
    issues.push({
      path: 'version',
      message: `Unsupported dataset version: ${rawObj['version']}. Currently supported version is ${SUPPORTED_DATASET_VERSION}`,
    });
  }

  // 2. Name validation
  if (typeof rawObj['name'] !== 'string' || rawObj['name'].trim().length === 0) {
    issues.push({
      path: 'name',
      message: 'Dataset must have a non-empty string "name"',
    });
  }

  // 3. Cases validation
  if (!Array.isArray(rawObj['cases'])) {
    issues.push({
      path: 'cases',
      message: 'Dataset "cases" must be an array of test cases',
    });
  } else if (rawObj['cases'].length === 0) {
    issues.push({
      path: 'cases',
      message: 'Dataset "cases" array must contain at least one case',
    });
  } else {
    const knownTypes = new Set<string>([
      ...BUILTIN_ASSERTION_TYPES,
      ...(options?.knownCustomTypes ?? []),
    ]);

    const seenCaseIds = new Map<string, number>();

    rawObj['cases'].forEach((caseItem, caseIndex) => {
      const casePath = `cases[${caseIndex}]`;

      if (caseItem === null || typeof caseItem !== 'object' || Array.isArray(caseItem)) {
        issues.push({
          path: casePath,
          message: `Case at index ${caseIndex} must be an object`,
        });
        return;
      }

      const c = caseItem as Record<string, unknown>;
      const caseId = c['id'];

      // ID check
      if (typeof caseId !== 'string' || caseId.trim().length === 0) {
        issues.push({
          path: `${casePath}.id`,
          message: `Case at index ${caseIndex} must have a non-empty string "id"`,
        });
      } else {
        if (seenCaseIds.has(caseId)) {
          const prevIndex = seenCaseIds.get(caseId);
          issues.push({
            path: `${casePath}.id`,
            caseId,
            message: `Duplicate case ID "${caseId}" found at index ${caseIndex} (already defined at index ${prevIndex})`,
          });
        } else {
          seenCaseIds.set(caseId, caseIndex);
        }
      }

      const activeCaseId = typeof caseId === 'string' ? caseId : undefined;

      // Check unexpected properties on case
      const KNOWN_CASE_KEYS = new Set([
        'id',
        'description',
        'tags',
        'input',
        'expected',
        'assertions',
        'metadata',
      ]);
      for (const key of Object.keys(c)) {
        if (!KNOWN_CASE_KEYS.has(key)) {
          issues.push({
            path: `${casePath}.${key}`,
            caseId: activeCaseId,
            message: `Unexpected property "${key}" in case "${caseId ?? caseIndex}". Custom fields should be placed inside "metadata".`,
          });
        }
      }

      // Tags check
      if (c['tags'] !== undefined) {
        if (
          !Array.isArray(c['tags']) ||
          !c['tags'].every((t) => typeof t === 'string' && t.trim().length > 0)
        ) {
          issues.push({
            path: `${casePath}.tags`,
            caseId: activeCaseId,
            message: `Case "${caseId ?? caseIndex}" tags must be an array of non-empty strings`,
          });
        }
      }

      // Input check
      if (c['input'] === undefined) {
        issues.push({
          path: `${casePath}.input`,
          caseId: activeCaseId,
          message: `Case "${caseId ?? caseIndex}" is missing required "input" field`,
        });
      }

      // Assertions check
      if (!Array.isArray(c['assertions'])) {
        issues.push({
          path: `${casePath}.assertions`,
          caseId: activeCaseId,
          message: `Case "${caseId ?? caseIndex}" must have an array of assertions`,
        });
      } else if (c['assertions'].length === 0) {
        issues.push({
          path: `${casePath}.assertions`,
          caseId: activeCaseId,
          message: `Case "${caseId ?? caseIndex}" must define at least one assertion`,
        });
      } else {
        c['assertions'].forEach((assertion, assertionIndex) => {
          const assertionPath = `${casePath}.assertions[${assertionIndex}]`;

          if (assertion === null || typeof assertion !== 'object' || Array.isArray(assertion)) {
            issues.push({
              path: assertionPath,
              caseId: activeCaseId,
              message: `Assertion at index ${assertionIndex} in case "${caseId ?? caseIndex}" must be an object`,
            });
            return;
          }

          const a = assertion as Record<string, unknown>;
          const assertionType = a['type'];

          if (typeof assertionType !== 'string' || assertionType.trim().length === 0) {
            issues.push({
              path: `${assertionPath}.type`,
              caseId: activeCaseId,
              message: `Assertion at index ${assertionIndex} in case "${caseId ?? caseIndex}" is missing "type"`,
            });
            return;
          }

          if (!knownTypes.has(assertionType)) {
            issues.push({
              path: `${assertionPath}.type`,
              caseId: activeCaseId,
              message: `Unknown assertion type "${assertionType}" in case "${caseId ?? caseIndex}". Supported types: ${Array.from(knownTypes).join(', ')}`,
            });
            return;
          }

          // Specific validation per built-in type
          if (assertionType === 'exact_match') {
            const parsed = ExactMatchSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid exact_match assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            } else if (parsed.data.expected === undefined && c['expected'] === undefined) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `exact_match assertion in case "${caseId ?? caseIndex}" requires either an "expected" property on the case or an "expected" field in the assertion config`,
              });
            }
          } else if (assertionType === 'required_content') {
            const parsed = RequiredContentSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid required_content assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'prohibited_content') {
            const parsed = ProhibitedContentSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid prohibited_content assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'json' || assertionType === 'json_valid') {
            const parsed = JsonValidSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid json assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'json_schema') {
            const parsed = JsonSchemaSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid json_schema assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'required_fields') {
            const parsed = RequiredFieldsSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid required_fields assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'field_types') {
            const parsed = FieldTypesSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid field_types assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'numeric_range' || assertionType === 'numeric') {
            const parsed = NumericRangeSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid numeric_range assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'regex_match' || assertionType === 'regex') {
            const parsed = RegexMatchSchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid regex_match assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          } else if (assertionType === 'similarity' || assertionType === 'levenshtein') {
            const parsed = SimilaritySchema.safeParse(a);
            if (!parsed.success) {
              issues.push({
                path: assertionPath,
                caseId: activeCaseId,
                message: `Invalid similarity assertion in case "${caseId ?? caseIndex}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              });
            }
          }
        });
      }
    });
  }

  if (issues.length > 0) {
    const errorDetails = issues
      .map((i) => `  - [${i.path}${i.caseId ? ` in case "${i.caseId}"` : ''}]: ${i.message}`)
      .join('\n');
    throw new DatasetValidationError(
      `Dataset validation failed with ${issues.length} issue(s):\n${errorDetails}`,
      issues,
    );
  }

  return rawObj as unknown as EvaluationDataset;
}
