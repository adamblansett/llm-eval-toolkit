import { describe, it, expect } from 'vitest';
import { TerminalReporter } from '../../../src/reporters/terminal.js';
import type { EvaluationReport } from '../../../src/runner/types.js';
import type { RegressionComparisonResult } from '../../../src/regression/types.js';

describe('TerminalReporter', () => {
  const sampleReport: EvaluationReport = {
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
    durationMs: 12.5,
    status: 'FAILED',
    cases: [
      {
        caseId: 'case-1',
        description: 'valid receipt',
        status: 'PASSED',
        assertions: [{ assertionType: 'json', status: 'PASSED', message: 'Valid' }],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 4,
        failureMessages: [],
        missingOutput: false,
      },
      {
        caseId: 'case-2',
        description: 'invalid receipt',
        status: 'FAILED',
        assertions: [
          {
            assertionType: 'exact_match',
            status: 'FAILED',
            message: 'Output does not match',
          },
        ],
        passedAssertions: 0,
        failedAssertions: 1,
        errorAssertions: 0,
        durationMs: 4,
        failureMessages: ['[exact_match]: Output does not match'],
        missingOutput: false,
      },
    ],
  };

  it('formats terminal output with summary and failure details', () => {
    const reporter = new TerminalReporter({ colors: false });
    const output = reporter.format(sampleReport);

    expect(output).toContain('LLM Eval Report: receipt-eval (v1)');
    expect(output).toContain('Total cases:       2');
    expect(output).toContain('Passed cases:      1');
    expect(output).toContain('Failed cases:      1');
    expect(output).toContain('Pass rate:         50.0%');
    expect(output).toContain('Failures & Errors (1):');
    expect(output).toContain('case-2 - invalid receipt');
    expect(output).toContain('[exact_match]: Output does not match');
    expect(output).toContain('Result: FAILED');
  });

  it('formats regression comparison block when provided', () => {
    const regression: RegressionComparisonResult = {
      datasetName: 'receipt-eval',
      baselineCreatedAt: '2025-09-30T00:00:00.000Z',
      totalCasesCurrent: 2,
      totalCasesBaseline: 2,
      newlyFailingCases: ['case-2'],
      recoveredCases: [],
      remainedPassingCases: ['case-1'],
      remainedFailingCases: [],
      addedCases: [],
      removedCases: [],
      isRegression: true,
      policy: 'fail-on-regression',
      policyViolations: ['Detected 1 newly failing case(s): case-2'],
    };

    const reporter = new TerminalReporter({ colors: false });
    const output = reporter.format(sampleReport, regression);

    expect(output).toContain('Regression Comparison (fail-on-regression):');
    expect(output).toContain('Newly failing:   1 (case-2)');
    expect(output).toContain('Result: REGRESSION DETECTED');
  });
});
