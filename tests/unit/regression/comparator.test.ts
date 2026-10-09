import { describe, it, expect } from 'vitest';
import {
  compareEvaluationWithBaseline,
  IncompatibleBaselineError,
} from '../../../src/regression/comparator.js';
import type { EvaluationReport } from '../../../src/runner/types.js';
import type { BaselineData } from '../../../src/regression/types.js';

describe('compareEvaluationWithBaseline', () => {
  const baseBaseline: BaselineData = {
    baselineVersion: 1,
    createdAt: '2025-10-01T00:00:00.000Z',
    datasetName: 'test-dataset',
    datasetVersion: 1,
    cases: {
      'case-1': { status: 'PASSED', passedAssertions: 2, failedAssertions: 0, errorAssertions: 0 },
      'case-2': { status: 'FAILED', passedAssertions: 0, failedAssertions: 1, errorAssertions: 0 },
      'case-3': { status: 'PASSED', passedAssertions: 1, failedAssertions: 0, errorAssertions: 0 },
    },
  };

  const createReport = (
    caseStatuses: Record<string, 'PASSED' | 'FAILED' | 'ERROR'>,
  ): EvaluationReport => {
    const cases = Object.entries(caseStatuses).map(([caseId, status]) => ({
      caseId,
      status,
      assertions: [],
      passedAssertions: status === 'PASSED' ? 1 : 0,
      failedAssertions: status === 'FAILED' ? 1 : 0,
      errorAssertions: status === 'ERROR' ? 1 : 0,
      durationMs: 5,
      failureMessages: status !== 'PASSED' ? ['failed'] : [],
      missingOutput: false,
    }));

    const passedCases = cases.filter((c) => c.status === 'PASSED').length;
    const failedCases = cases.filter((c) => c.status === 'FAILED').length;
    const errorCases = cases.filter((c) => c.status === 'ERROR').length;

    return {
      datasetName: 'test-dataset',
      datasetVersion: 1,
      timestamp: '2025-10-02T00:00:00.000Z',
      totalCases: cases.length,
      passedCases,
      failedCases,
      errorCases,
      skippedCases: 0,
      passRate: (passedCases / cases.length) * 100,
      assertionTotals: {
        total: cases.length,
        passed: passedCases,
        failed: failedCases,
        errors: errorCases,
      },
      durationMs: 20,
      status: failedCases > 0 || errorCases > 0 ? 'FAILED' : 'PASSED',
      cases,
    };
  };

  it('identifies newly failing cases and flags regression under default policy', () => {
    // case-1 was PASSED in baseline, now FAILED
    // case-2 was FAILED in baseline, now PASSED (recovered)
    // case-3 remains PASSED
    const report = createReport({
      'case-1': 'FAILED',
      'case-2': 'PASSED',
      'case-3': 'PASSED',
    });

    const comparison = compareEvaluationWithBaseline(report, baseBaseline, 'fail-on-regression');

    expect(comparison.newlyFailingCases).toEqual(['case-1']);
    expect(comparison.recoveredCases).toEqual(['case-2']);
    expect(comparison.remainedPassingCases).toEqual(['case-3']);
    expect(comparison.isRegression).toBe(true);
    expect(comparison.policyViolations[0]).toContain('Detected 1 newly failing case(s): case-1');
  });

  it('does not flag regression when no previously passing case regressed', () => {
    // case-1 PASSED, case-2 still FAILED (no new regression), case-3 PASSED
    const report = createReport({
      'case-1': 'PASSED',
      'case-2': 'FAILED',
      'case-3': 'PASSED',
    });

    const comparison = compareEvaluationWithBaseline(report, baseBaseline, 'fail-on-regression');

    expect(comparison.newlyFailingCases).toEqual([]);
    expect(comparison.remainedFailingCases).toEqual(['case-2']);
    expect(comparison.isRegression).toBe(false);
  });

  it('detects added and removed cases', () => {
    const report = createReport({
      'case-1': 'PASSED',
      // case-2 is omitted (removed)
      'case-3': 'PASSED',
      'case-4': 'PASSED', // newly added
    });

    const comparison = compareEvaluationWithBaseline(report, baseBaseline, 'strict');

    expect(comparison.addedCases).toEqual(['case-4']);
    expect(comparison.removedCases).toEqual(['case-2']);
    // Under strict policy, removed cases trigger violation
    expect(comparison.isRegression).toBe(true);
    expect(comparison.policyViolations.some((v) => v.includes('removed case(s)'))).toBe(true);
  });

  it('throws IncompatibleBaselineError on dataset name mismatch', () => {
    const report = {
      ...createReport({ 'case-1': 'PASSED' }),
      datasetName: 'completely-different-dataset',
    };

    expect(() => compareEvaluationWithBaseline(report, baseBaseline)).toThrow(
      IncompatibleBaselineError,
    );
  });

  it('throws IncompatibleBaselineError on dataset version mismatch', () => {
    const report = {
      ...createReport({ 'case-1': 'PASSED' }),
      datasetVersion: 2,
    };

    expect(() => compareEvaluationWithBaseline(report, baseBaseline)).toThrow(
      IncompatibleBaselineError,
    );
  });

  it('throws IncompatibleBaselineError on invalid regression policy', () => {
    const report = createReport({ 'case-1': 'PASSED' });
    // @ts-expect-error testing invalid policy
    expect(() => compareEvaluationWithBaseline(report, baseBaseline, 'invalid-policy')).toThrow(
      /Invalid regression policy: "invalid-policy"/,
    );
  });
});
