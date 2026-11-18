import path from 'node:path';
import { SUPPORTED_OUTPUT_VERSION } from '../config/constants.js';
import { readJsonSafely, readJsonlSafely } from '../utils/fs.js';
import { resolveSafePath } from '../utils/path.js';
import { validateDataset, type ValidateDatasetOptions } from './validator.js';
import type { EvaluationDataset, OutputMap } from './types.js';

export interface LoadOptions extends ValidateDatasetOptions {
  maxSizeBytes?: number;
}

/**
 * Loads and validates an evaluation dataset JSON or JSONL file.
 */
export async function loadDataset(
  filePath: string,
  options?: LoadOptions,
): Promise<EvaluationDataset> {
  const resolvedPath = resolveSafePath(filePath);

  if (resolvedPath.endsWith('.jsonl')) {
    const items = await readJsonlSafely<Record<string, unknown>>(resolvedPath, {
      maxSizeBytes: options?.maxSizeBytes,
    });

    let datasetObj: unknown;
    if (
      items.length > 0 &&
      typeof items[0] === 'object' &&
      items[0] !== null &&
      'version' in items[0] &&
      'name' in items[0] &&
      !('assertions' in items[0])
    ) {
      const header = items[0];
      const cases = items.slice(1);
      datasetObj = {
        version: header.version,
        name: header.name,
        description: header.description,
        metadata: header.metadata,
        cases,
      };
    } else {
      const defaultName = path.basename(resolvedPath, '.jsonl');
      datasetObj = {
        version: 1,
        name: defaultName,
        cases: items,
      };
    }

    return validateDataset(datasetObj, options);
  }

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

  // Format 1: Array of { id / caseId, output } or { [caseId]: output }
  if (Array.isArray(raw)) {
    const map: OutputMap = {};
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new OutputFixtureError(
          `Outputs array item at index ${i} must be an object with "id" and "output"`,
        );
      }
      const itemObj = item as Record<string, unknown>;
      const id = (itemObj['id'] ?? itemObj['caseId']) as string | undefined;

      if (typeof id === 'string' && id.trim().length > 0) {
        if (!('output' in itemObj)) {
          throw new OutputFixtureError(
            `Outputs array item at index ${i} is missing "output" field`,
          );
        }
        if (Object.prototype.hasOwnProperty.call(map, id)) {
          throw new OutputFixtureError(
            `Outputs array contains duplicate case ID "${id}" at index ${i}`,
          );
        }
        map[id] = itemObj['output'];
      } else {
        throw new OutputFixtureError(
          `Outputs array item at index ${i} is missing a valid string "id"`,
        );
      }
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
 * Loads and normalizes an output fixtures JSON or JSONL file.
 */
export async function loadOutputs(
  filePath: string,
  options?: { maxSizeBytes?: number },
): Promise<OutputMap> {
  const resolvedPath = resolveSafePath(filePath);

  if (resolvedPath.endsWith('.jsonl')) {
    const items = await readJsonlSafely<unknown>(resolvedPath, {
      maxSizeBytes: options?.maxSizeBytes,
    });
    return normalizeOutputs(items);
  }

  const json = await readJsonSafely(resolvedPath, { maxSizeBytes: options?.maxSizeBytes });
  return normalizeOutputs(json);
}
