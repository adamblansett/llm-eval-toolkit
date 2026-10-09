import { describe, it, expect } from 'vitest';
import { JsonReporter } from '../../../src/reporters/json.js';
import type { EvaluationReport } from '../../../src/runner/types.js';

describe('JsonReporter', () => {
  const sampleReport: EvaluationReport = {
    datasetName: 'json-eval',
    datasetVersion: 1,
    timestamp: '2025-10-01T12:00:00.000Z',
    totalCases: 1,
    passedCases: 1,
    failedCases: 0,
    errorCases: 0,
    skippedCases: 0,
    passRate: 100.0,
    assertionTotals: { total: 1, passed: 1, failed: 0, errors: 0 },
    durationMs: 5.0,
    status: 'PASSED',
    cases: [
      {
        caseId: 'case-1',
        status: 'PASSED',
        assertions: [],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 2,
        failureMessages: [],
        missingOutput: false,
      },
    ],
  };

  it('outputs valid, parseable JSON payload', () => {
    const reporter = new JsonReporter();
    const raw = reporter.format(sampleReport);
    const parsed = JSON.parse(raw);

    expect(parsed.report.datasetName).toBe('json-eval');
    expect(parsed.report.status).toBe('PASSED');
  });

  it('supports compact output mode', () => {
    const reporter = new JsonReporter({ pretty: false });
    const raw = reporter.format(sampleReport);

    expect(raw).not.toContain('\n');
    expect(JSON.parse(raw).report.datasetName).toBe('json-eval');
  });
});
