import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Evaluator } from '../evaluators/types.js';
import type { RegressionPolicy } from '../regression/types.js';
import { FileNotFoundError } from '../utils/fs.js';

export interface LlmEvalConfig {
  defaultReporter?: 'terminal' | 'json' | 'markdown' | 'junit' | 'github';
  defaultBaselinePolicy?: RegressionPolicy;
  evaluators?: Evaluator[];
  maxFileSize?: number;
  output?: string;
}

/**
 * Type-safe configuration helper for llm-eval configuration files.
 */
export function defineConfig(config: LlmEvalConfig): LlmEvalConfig {
  return config;
}

const DEFAULT_CONFIG_FILES = [
  'llm-eval.config.js',
  'llm-eval.config.mjs',
  'llm-eval.config.ts',
  'llm-eval.config.json',
];

/**
 * Attempts to load configuration from custom path or default filenames in cwd.
 */
export async function loadConfigFile(customPath?: string): Promise<LlmEvalConfig | null> {
  let targetPath: string | null = null;

  if (customPath) {
    targetPath = path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath);
    if (!fs.existsSync(targetPath)) {
      throw new FileNotFoundError(customPath);
    }
  } else {
    for (const file of DEFAULT_CONFIG_FILES) {
      const candidate = path.resolve(process.cwd(), file);
      if (fs.existsSync(candidate)) {
        targetPath = candidate;
        break;
      }
    }
  }

  if (!targetPath) {
    return null;
  }

  if (targetPath.endsWith('.json')) {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(raw) as LlmEvalConfig;
  }

  try {
    const fileUrl = pathToFileURL(targetPath).href;
    const mod = await import(fileUrl);
    return (mod.default ?? mod) as LlmEvalConfig;
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to load config file "${targetPath}": ${error.message}`);
  }
}

/**
 * Dynamically loads and instantiates custom evaluators from user file paths.
 */
export async function loadEvaluatorsFromPaths(filePaths: string[]): Promise<Evaluator[]> {
  const evaluators: Evaluator[] = [];

  for (const fp of filePaths) {
    const resolved = path.isAbsolute(fp) ? fp : path.resolve(process.cwd(), fp);
    if (!fs.existsSync(resolved)) {
      throw new FileNotFoundError(fp);
    }

    try {
      const fileUrl = pathToFileURL(resolved).href;
      const mod = await import(fileUrl);
      const exported = mod.default ?? mod;

      if (Array.isArray(exported)) {
        for (const item of exported) {
          if (typeof item === 'function') {
            evaluators.push(new (item as new () => Evaluator)());
          } else if (item && typeof item === 'object') {
            evaluators.push(item as Evaluator);
          }
        }
      } else if (typeof exported === 'function') {
        evaluators.push(new (exported as new () => Evaluator)());
      } else if (exported && typeof exported === 'object') {
        evaluators.push(exported as Evaluator);
      }
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Failed to load evaluator from "${fp}": ${error.message}`);
    }
  }

  return evaluators;
}
