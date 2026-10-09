import { SUPPORTED_OUTPUT_VERSION } from '../config/constants.js';
import { readJsonSafely } from '../utils/fs.js';
import { resolveSafePath } from '../utils/path.js';
import { validateDataset, type ValidateDatasetOptions } from './validator.js';
import type { EvaluationDataset, OutputMap } from './types.js';

export interface LoadOptions extends ValidateDatasetOptions {
  maxSizeBytes?: number;
}

/**
 * Loads and validates an evaluation dataset JSON file.
 */
export async function loadDataset(
  filePath: string,
  options?: LoadOptions,
): Promise<EvaluationDataset> {
  const resolvedPath = resolveSafePath(filePath);
  const json = await readJsonSafely(resolvedPath, { maxSizeBytes: options?.maxSizeBytes });
  return validateDataset(json, options);
}

export class OutputFixtureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutputFixtureError';
  }
}

/**
 * Normalizes raw outputs into a consistent mapping of caseId -> output.
 */
export function normalizeOutputs(raw: unknown): OutputMap {
  if (raw === null || raw === undefined) {
    throw new OutputFixtureError('Outputs file is empty or null');
  }

  // Format 1: Array of { id, output }
  if (Array.isArray(raw)) {
    const map: OutputMap = {};
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new OutputFixtureError(
          `Outputs array item at index ${i} must be an object with "id" and "output"`,
        );
      }
      const { id, output } = item as { id?: unknown; output?: unknown };
      if (typeof id !== 'string' || id.trim().length === 0) {
        throw new OutputFixtureError(
          `Outputs array item at index ${i} is missing a valid string "id"`,
        );
      }
      if (Object.prototype.hasOwnProperty.call(map, id)) {
        throw new OutputFixtureError(
          `Outputs array contains duplicate case ID "${id}" at index ${i}`,
        );
      }
      map[id] = output;
    }
    return map;
  }

  if (typeof raw !== 'object') {
    throw new OutputFixtureError('Outputs must be a JSON object or array');
  }

  const rawObj = raw as Record<string, unknown>;

  // Check version if present
  if (rawObj['version'] !== undefined) {
    if (typeof rawObj['version'] !== 'number' || rawObj['version'] !== SUPPORTED_OUTPUT_VERSION) {
      throw new OutputFixtureError(
        `Unsupported output fixture version: ${rawObj['version']}. Supported version is ${SUPPORTED_OUTPUT_VERSION}`,
      );
    }
  }

  // Format 2: { cases: [ { id, output } ] }
  if (Array.isArray(rawObj['cases'])) {
    return normalizeOutputs(rawObj['cases']);
  }

  // Format 3: { version: 1, outputs: { ... } }
  if (rawObj['outputs'] !== undefined) {
    if (
      rawObj['outputs'] === null ||
      typeof rawObj['outputs'] !== 'object' ||
      Array.isArray(rawObj['outputs'])
    ) {
      throw new OutputFixtureError(
        'The "outputs" field in output fixture must be an object mapping case IDs to outputs',
      );
    }
    return rawObj['outputs'] as OutputMap;
  }

  // Format 4: Direct key-value map { "case-001": output, ... }
  return rawObj as OutputMap;
}

/**
 * Loads and normalizes an output fixtures JSON file.
 */
export async function loadOutputs(
  filePath: string,
  options?: { maxSizeBytes?: number },
): Promise<OutputMap> {
  const resolvedPath = resolveSafePath(filePath);
  const json = await readJsonSafely(resolvedPath, { maxSizeBytes: options?.maxSizeBytes });
  return normalizeOutputs(json);
}
