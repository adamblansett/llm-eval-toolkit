import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  createBaselineFromReport,
  saveBaseline,
  loadBaseline,
  validateBaseline,
  BaselineFormatError,
} from '../../../src/regression/storage.js';
import type { EvaluationReport } from '../../../src/runner/types.js';

describe('baseline storage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-eval-baseline-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const mockReport: EvaluationReport = {
    datasetName: 'receipt-eval',
    datasetVersion: 1,
    timestamp: '2025-10-01T12:00:00.000Z',
    totalCases: 2,
    passedCases: 1,
    failedCases: 1,
    errorCases: 0,
    skippedCases: 0,
    passRate: 50.0,
    assertionTotals: { total: 2, passed: 1, failed: 1, errors: 0 },
    durationMs: 15,
    status: 'FAILED',
    cases: [
      {
        caseId: 'case-1',
        description: 'valid receipt',
        status: 'PASSED',
        assertions: [{ assertionType: 'json', status: 'PASSED', message: 'ok' }],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 5,
        failureMessages: [],
      },
      {
        caseId: 'case-2',
        description: 'invalid receipt',
        status: 'FAILED',
        assertions: [{ assertionType: 'json', status: 'FAILED', message: 'bad' }],
        passedAssertions: 0,
        failedAssertions: 1,
        errorAssertions: 0,
        durationMs: 5,
        failureMessages: ['bad'],
      },
    ],
  };

  it('creates clean baseline without sensitive raw payloads', () => {
    const baseline = createBaselineFromReport(mockReport);

    expect(baseline.baselineVersion).toBe(1);
    expect(baseline.datasetName).toBe('receipt-eval');
    expect(baseline.datasetVersion).toBe(1);
    expect(baseline.cases['case-1']?.status).toBe('PASSED');
    expect(baseline.cases['case-2']?.status).toBe('FAILED');
    // Ensure raw inputs or outputs are not persisted
    expect((baseline as unknown as Record<string, unknown>)['inputs']).toBeUndefined();
    expect((baseline as unknown as Record<string, unknown>)['outputs']).toBeUndefined();
  });

  it('saves and loads baseline file accurately', async () => {
    const baseline = createBaselineFromReport(mockReport);
    const filePath = path.join(tempDir, 'baseline.json');

    await saveBaseline(filePath, baseline);
    const loaded = await loadBaseline(filePath);

    expect(loaded.datasetName).toBe('receipt-eval');
    expect(loaded.cases['case-1']?.status).toBe('PASSED');
    expect(loaded.cases['case-2']?.status).toBe('FAILED');
  });

  it('rejects unsupported baseline version or malformed data', () => {
    expect(() => validateBaseline('not-json-object')).toThrow(BaselineFormatError);
    expect(() => validateBaseline({ baselineVersion: 99 })).toThrow(
      /Unsupported baseline version: 99/,
    );
    expect(() =>
      validateBaseline({
        baselineVersion: 1,
        datasetName: 'test',
        datasetVersion: 1,
        cases: {
          'case-1': { status: 'INVALID_STATUS' },
        },
      }),
    ).toThrow(/invalid status "INVALID_STATUS"/);
  });
});
