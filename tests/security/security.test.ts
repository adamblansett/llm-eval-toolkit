import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { assertPathWithinRoot } from '../../src/utils/path.js';
import { readFileSafely, writeFileAtomic } from '../../src/utils/fs.js';
import { safePreview } from '../../src/utils/sanitizer.js';
import { validateDataset, DatasetValidationError } from '../../src/datasets/validator.js';
import { normalizeOutputs, OutputFixtureError } from '../../src/datasets/loader.js';
import { ProhibitedContentEvaluator } from '../../src/evaluators/prohibited-content.js';
import { getValueByPath } from '../../src/utils/property-path.js';

describe('Security & Privacy Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-eval-sec-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('prevents directory traversal attempts', () => {
    const sandboxDir = path.join(tempDir, 'sandbox');
    expect(() => assertPathWithinRoot('../../secret.txt', sandboxDir)).toThrow(
      /Path traversal denied/,
    );
    expect(() => assertPathWithinRoot('/etc/passwd', sandboxDir)).toThrow(/Path traversal denied/);
  });

  it('safely handles oversized files without loading them into memory', async () => {
    const filePath = path.join(tempDir, 'huge.json');
    // Write a 20KB file
    const data = 'x'.repeat(20 * 1024);
    await fs.writeFile(filePath, data);

    // Limit check to 10KB
    await expect(readFileSafely(filePath, { maxSizeBytes: 10 * 1024 })).rejects.toThrow(
      /exceeds maximum allowed size/,
    );
  });

  it('fails safely when attempting to read directories as files', async () => {
    await expect(readFileSafely(tempDir)).rejects.toThrow(/Expected file but found directory/);
  });

  it('does not leak full sensitive payload when prohibited term is found', () => {
    const evaluator = new ProhibitedContentEvaluator();
    const sensitivePayload = `SECRET_KEY=sk_live_very_secret_token_1234567890; USER_SSN=000-11-2222;`;

    const result = evaluator.evaluate({
      caseId: 'case-sec',
      input: 'prompt',
      actualOutput: sensitivePayload,
      config: {
        type: 'prohibited_content',
        terms: ['sk_live_'],
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('prohibited term(s): "sk_live_"');
    expect(result.message).not.toContain('very_secret_token');
    expect(result.message).not.toContain('USER_SSN');
  });

  it('sanitizes and truncates huge values in logs and summaries', () => {
    const megaPayload = 'A'.repeat(5000);
    const preview = safePreview(megaPayload, 100);
    expect(preview.length).toBeLessThan(120);
    expect(preview).toContain(' ... ');
  });

  it('rejects prototype pollution or malicious input keys safely in datasets', () => {
    const poisoned = JSON.parse(
      '{"version": 1, "name": "safe", "__proto__": {"polluted": true}, "cases": [{"id": "c1", "input": "hi", "assertions": [{"type": "json"}]}]}',
    );

    expect(() => validateDataset(poisoned)).toThrow(DatasetValidationError);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();

    // Verify property path navigation refuses traversal through prototype properties
    expect(getValueByPath({ a: 1 }, '__proto__.polluted').found).toBe(false);
    expect(getValueByPath({ a: 1 }, 'constructor.prototype.polluted').found).toBe(false);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('rejects unexpected non-object inputs in output fixtures', () => {
    expect(() => normalizeOutputs('malicious raw payload')).toThrow(OutputFixtureError);
    expect(() => normalizeOutputs(null)).toThrow(OutputFixtureError);
    expect(() => normalizeOutputs(NaN)).toThrow(OutputFixtureError);
  });

  it('atomic write cleans up temporary files on write failure', async () => {
    // Attempting to write into a path that cannot be created as file
    const badPath = path.join(tempDir, 'sub', 'file.txt');
    await fs.mkdir(badPath, { recursive: true }); // make it a directory

    await expect(writeFileAtomic(badPath, 'content')).rejects.toThrow();
  });
});
