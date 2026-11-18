import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubReporter } from '../../../src/reporters/github.js';
import type { EvaluationReport } from '../../../src/runner/types.js';
import type { RegressionComparisonResult } from '../../../src/regression/types.js';

describe('GitHubReporter', () => {
  let tmpDir: string;
  let summaryPath: string;
  const originalEnv = process.env.GITHUB_STEP_SUMMARY;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-rep-test-'));
    summaryPath = path.join(tmpDir, 'step-summary.md');
    process.env.GITHUB_STEP_SUMMARY = summaryPath;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GITHUB_STEP_SUMMARY = originalEnv;
    } else {
      delete process.env.GITHUB_STEP_SUMMARY;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sampleReport: EvaluationReport = {
    datasetName: 'gh-actions-eval',
    datasetVersion: 1,
    timestamp: '2026-03-01T00:00:00.000Z',
    totalCases: 2,
    passedCases: 1,
    failedCases: 1,
    errorCases: 0,
    skippedCases: 0,
    passRate: 50.0,
    assertionTotals: { total: 2, passed: 1, failed: 1, errors: 0 },
    durationMs: 100,
    status: 'FAILED',
    cases: [
      {
        caseId: 'case-pass',
        status: 'PASSED',
        assertions: [],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 50,
        failureMessages: [],
        missingOutput: false,
      },
      {
        caseId: 'case-fail',
        status: 'FAILED',
        assertions: [],
        passedAssertions: 0,
        failedAssertions: 1,
        errorAssertions: 0,
        durationMs: 50,
        failureMessages: ['Mismatch on expected output'],
        missingOutput: false,
      },
    ],
  };

  it('emits GitHub Actions workflow commands (::error) for failed cases', () => {
    const reporter = new GitHubReporter({ writeStepSummary: false });
    const output = reporter.format(sampleReport);

    expect(output).toContain(
      '::error title=Evaluation Failed (case-fail)::Mismatch on expected output',
    );
  });

  it('emits workflow command for regression violations', () => {
    const regression: RegressionComparisonResult = {
      datasetName: 'gh-actions-eval',
      policy: 'strict',
      baselineCreatedAt: '2026-02-01T00:00:00.000Z',
      isRegression: true,
      policyViolations: ['Regression detected in case-fail'],
      newlyFailingCases: ['case-fail'],
      recoveredCases: [],
      remainedPassingCases: ['case-pass'],
      remainedFailingCases: [],
      addedCases: [],
      removedCases: [],
      totalCasesBaseline: 2,
      totalCasesCurrent: 2,
    };

    const reporter = new GitHubReporter({ writeStepSummary: false });
    const output = reporter.format(sampleReport, regression);

    expect(output).toContain(
      '::error title=Regression Detected (strict)::Regression detected in case-fail',
    );
  });

  it('writes markdown report to GITHUB_STEP_SUMMARY when configured', () => {
    const reporter = new GitHubReporter({ writeStepSummary: true });
    reporter.format(sampleReport);

    expect(fs.existsSync(summaryPath)).toBe(true);
    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('# LLM Eval Report: gh-actions-eval');
  });
});
