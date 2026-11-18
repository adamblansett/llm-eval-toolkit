import { describe, it, expect } from 'vitest';
import { MarkdownReporter } from '../../../src/reporters/markdown.js';
import type { EvaluationReport } from '../../../src/runner/types.js';
import type { RegressionComparisonResult } from '../../../src/regression/types.js';

describe('MarkdownReporter', () => {
  const sampleReport: EvaluationReport = {
    datasetName: 'test-dataset',
    datasetVersion: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    totalCases: 2,
    passedCases: 1,
    failedCases: 1,
    errorCases: 0,
    skippedCases: 0,
    passRate: 50.0,
    assertionTotals: { total: 2, passed: 1, failed: 1, errors: 0 },
    durationMs: 42.5,
    status: 'FAILED',
    cases: [
      {
        caseId: 'case-pass',
        status: 'PASSED',
        assertions: [
          {
            assertionType: 'exact_match',
            status: 'PASSED',
            message: 'Matches',
            durationMs: 1,
          },
        ],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 1,
        failureMessages: [],
        missingOutput: false,
      },
      {
        caseId: 'case-fail',
        status: 'FAILED',
        description: 'Verify greeting',
        assertions: [
          {
            assertionType: 'exact_match',
            status: 'FAILED',
            message: 'Output does not match expected string',
            diagnostics: {
              diff: '- hello\n+ world',
            },
            durationMs: 2,
          },
        ],
        passedAssertions: 0,
        failedAssertions: 1,
        errorAssertions: 0,
        durationMs: 2,
        failureMessages: ['Output does not match expected string'],
        missingOutput: false,
      },
    ],
  };

  it('formats markdown header and summary table', () => {
    const reporter = new MarkdownReporter();
    const md = reporter.format(sampleReport);

    expect(md).toContain('# LLM Eval Report: test-dataset (v1)');
    expect(md).toContain('| **Total Cases** | `2` |');
    expect(md).toContain('| **Passed Cases** | `1` |');
    expect(md).toContain('| **Failed Cases** | `1` |');
    expect(md).toContain('| **Pass Rate** | **`50.0%`** |');
  });

  it('includes collapsible details block with diff for failed cases', () => {
    const reporter = new MarkdownReporter();
    const md = reporter.format(sampleReport);

    expect(md).toContain('<details>');
    expect(md).toContain(
      '<summary><strong>❌ Case `case-fail`: Verify greeting</strong></summary>',
    );
    expect(md).toContain('```diff');
    expect(md).toContain('- hello\n+ world');
    expect(md).toContain('</details>');
  });

  it('formats regression comparison section when provided', () => {
    const regression: RegressionComparisonResult = {
      datasetName: 'test-dataset',
      policy: 'strict',
      baselineCreatedAt: '2025-12-01T00:00:00.000Z',
      isRegression: true,
      policyViolations: ['Case "case-fail" newly failed'],
      newlyFailingCases: ['case-fail'],
      recoveredCases: [],
      remainedPassingCases: ['case-pass'],
      remainedFailingCases: [],
      addedCases: [],
      removedCases: [],
      totalCasesBaseline: 2,
      totalCasesCurrent: 2,
    };

    const reporter = new MarkdownReporter();
    const md = reporter.format(sampleReport, regression);

    expect(md).toContain('🛑 **REGRESSION DETECTED**');
    expect(md).toContain('## Regression Comparison (`strict`)');
    expect(md).toContain('### ⚠️ Regression Policy Violations');
    expect(md).toContain('- Case "case-fail" newly failed');
  });
});
