import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  defineConfig,
  loadConfigFile,
  loadEvaluatorsFromPaths,
} from '../../../src/config/loader.js';
import type { Evaluator } from '../../../src/evaluators/types.js';

describe('config loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-eval-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('defineConfig', () => {
    it('returns the same configuration object (identity function for type checking)', () => {
      const config = { defaultReporter: 'markdown' as const };
      expect(defineConfig(config)).toBe(config);
    });
  });

  describe('loadConfigFile', () => {
    it('rejects when custom config file does not exist', async () => {
      await expect(loadConfigFile(path.join(tmpDir, 'does-not-exist.json'))).rejects.toThrow();
    });

    it('loads and parses json configuration file correctly', async () => {
      const jsonConfigPath = path.join(tmpDir, 'llm-eval.config.json');
      fs.writeFileSync(
        jsonConfigPath,
        JSON.stringify({ defaultReporter: 'junit', maxFileSize: 50000 }),
        'utf-8',
      );

      const config = await loadConfigFile(jsonConfigPath);
      expect(config).toEqual({ defaultReporter: 'junit', maxFileSize: 50000 });
    });

    it('loads and imports js configuration module', async () => {
      const jsConfigPath = path.join(tmpDir, 'llm-eval.config.mjs');
      fs.writeFileSync(
        jsConfigPath,
        'export default { defaultReporter: "github", defaultBaselinePolicy: "strict" };\n',
        'utf-8',
      );

      const config = await loadConfigFile(jsConfigPath);
      expect(config?.defaultReporter).toBe('github');
      expect(config?.defaultBaselinePolicy).toBe('strict');
    });
  });

  describe('loadEvaluatorsFromPaths', () => {
    it('throws FileNotFoundError when evaluator file does not exist', async () => {
      await expect(
        loadEvaluatorsFromPaths([path.join(tmpDir, 'nonexistent-evaluator.js')]),
      ).rejects.toThrow();
    });

    it('loads custom evaluator instance from an mjs file', async () => {
      const customEvalPath = path.join(tmpDir, 'custom-evaluator.mjs');
      const code = `
        export default class MyCustomEvaluator {
          type = "custom_test";
          evaluate(ctx) {
            return {
              assertionType: "custom_test",
              status: "PASSED",
              message: "Custom evaluator passed",
              durationMs: 1
            };
          }
        }
      `;
      fs.writeFileSync(customEvalPath, code, 'utf-8');

      const loaded = await loadEvaluatorsFromPaths([customEvalPath]);
      expect(loaded.length).toBe(1);
      const ev = loaded[0] as Evaluator;
      expect(ev.type).toBe('custom_test');

      const res = await Promise.resolve(
        ev.evaluate({
          caseId: '1',
          input: 'test',
          actualOutput: 'val',
          config: { type: 'custom_test' },
        }),
      );
      expect(res.status).toBe('PASSED');
      expect(res.message).toBe('Custom evaluator passed');
    });
  });
});
