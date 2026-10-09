import { SUPPORTED_BASELINE_VERSION } from '../config/constants.js';
import { readJsonSafely, writeFileAtomic } from '../utils/fs.js';
import { resolveSafePath } from '../utils/path.js';
import type { EvaluationReport } from '../runner/types.js';
import type { BaselineData, BaselineCaseRecord } from './types.js';

export class BaselineFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaselineFormatError';
  }
}

/**
 * Creates a baseline data structure from an evaluation report without storing raw prompts or outputs.
 */
export function createBaselineFromReport(
  report: EvaluationReport,
  metadata?: Record<string, unknown>,
): BaselineData {
  const cases: Record<string, BaselineCaseRecord> = {};

  for (const c of report.cases) {
    cases[c.caseId] = {
      status: c.status,
      passedAssertions: c.passedAssertions,
      failedAssertions: c.failedAssertions,
      errorAssertions: c.errorAssertions,
      assertionTypes: c.assertions.map((a) => a.assertionType),
    };
  }

  return {
    baselineVersion: SUPPORTED_BASELINE_VERSION,
    createdAt: new Date().toISOString(),
    datasetName: report.datasetName,
    datasetVersion: report.datasetVersion,
    metadata,
    cases,
  };
}

/**
 * Validates the structure and version of raw baseline data.
 */
export function validateBaseline(raw: unknown): BaselineData {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BaselineFormatError('Baseline content must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['baselineVersion'] === undefined) {
    throw new BaselineFormatError('Baseline is missing required "baselineVersion"');
  }

  if (obj['baselineVersion'] !== SUPPORTED_BASELINE_VERSION) {
    throw new BaselineFormatError(
      `Unsupported baseline version: ${obj['baselineVersion']}. Supported version is ${SUPPORTED_BASELINE_VERSION}`,
    );
  }

  if (typeof obj['datasetName'] !== 'string' || obj['datasetName'].trim().length === 0) {
    throw new BaselineFormatError('Baseline is missing a valid "datasetName"');
  }

  if (typeof obj['datasetVersion'] !== 'number') {
    throw new BaselineFormatError('Baseline is missing a valid numeric "datasetVersion"');
  }

  if (obj['cases'] === null || typeof obj['cases'] !== 'object' || Array.isArray(obj['cases'])) {
    throw new BaselineFormatError('Baseline "cases" must be a dictionary of case records');
  }

  const rawCases = obj['cases'] as Record<string, unknown>;
  const validatedCases: Record<string, BaselineCaseRecord> = {};

  for (const [caseId, record] of Object.entries(rawCases)) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new BaselineFormatError(`Case "${caseId}" in baseline must be an object`);
    }

    const r = record as Record<string, unknown>;
    const status = r['status'];
    if (status !== 'PASSED' && status !== 'FAILED' && status !== 'ERROR' && status !== 'SKIPPED') {
      throw new BaselineFormatError(`Case "${caseId}" in baseline has invalid status "${status}"`);
    }

    validatedCases[caseId] = {
      status,
      passedAssertions: typeof r['passedAssertions'] === 'number' ? r['passedAssertions'] : 0,
      failedAssertions: typeof r['failedAssertions'] === 'number' ? r['failedAssertions'] : 0,
      errorAssertions: typeof r['errorAssertions'] === 'number' ? r['errorAssertions'] : 0,
      assertionTypes: Array.isArray(r['assertionTypes'])
        ? (r['assertionTypes'] as string[])
        : undefined,
    };
  }

  return {
    baselineVersion: obj['baselineVersion'] as number,
    createdAt: typeof obj['createdAt'] === 'string' ? obj['createdAt'] : new Date().toISOString(),
    datasetName: obj['datasetName'],
    datasetVersion: obj['datasetVersion'] as number,
    metadata:
      obj['metadata'] && typeof obj['metadata'] === 'object' && !Array.isArray(obj['metadata'])
        ? (obj['metadata'] as Record<string, unknown>)
        : undefined,
    cases: validatedCases,
  };
}

/**
 * Saves a baseline object to disk atomically.
 */
export async function saveBaseline(filePath: string, baseline: BaselineData): Promise<void> {
  const resolvedPath = resolveSafePath(filePath);
  const content = JSON.stringify(baseline, null, 2);
  await writeFileAtomic(resolvedPath, content);
}

/**
 * Loads and validates a baseline JSON file from disk.
 */
export async function loadBaseline(
  filePath: string,
  options?: { maxSizeBytes?: number },
): Promise<BaselineData> {
  const resolvedPath = resolveSafePath(filePath);
  const json = await readJsonSafely(resolvedPath, options);
  return validateBaseline(json);
}
