import { describe, it, expect } from 'vitest';
import { JunitReporter } from '../../../src/reporters/junit.js';
import type { EvaluationReport } from '../../../src/runner/types.js';

describe('JunitReporter', () => {
  const sampleReport: EvaluationReport = {
    datasetName: 'junit-eval-suite',
    datasetVersion: 1,
    timestamp: '2026-02-01T10:00:00.000Z',
    totalCases: 2,
    passedCases: 1,
    failedCases: 1,
    errorCases: 0,
    skippedCases: 0,
    passRate: 50.0,
    assertionTotals: { total: 2, passed: 1, failed: 1, errors: 0 },
    durationMs: 1500,
    status: 'FAILED',
    cases: [
      {
        caseId: 'test-success',
        status: 'PASSED',
        assertions: [],
        passedAssertions: 1,
        failedAssertions: 0,
        errorAssertions: 0,
        durationMs: 500,
        failureMessages: [],
        missingOutput: false,
      },
      {
        caseId: 'test-failure',
        description: 'Check <special> chars & XML quotes "val"',
        status: 'FAILED',
        assertions: [],
        passedAssertions: 0,
        failedAssertions: 1,
        errorAssertions: 0,
        durationMs: 1000,
        failureMessages: ['Expected <foo> & "bar"'],
        missingOutput: false,
      },
    ],
  };

  it('generates valid JUnit XML document', () => {
    const reporter = new JunitReporter();
    const xml = reporter.format(sampleReport);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites name="llm-eval" tests="2" failures="1" errors="0"');
    expect(xml).toContain('<testsuite name="junit-eval-suite"');
    expect(xml).toContain('</testsuite>');
    expect(xml).toContain('</testsuites>');
  });

  it('escapes XML special characters in case names and failure messages', () => {
    const reporter = new JunitReporter();
    const xml = reporter.format(sampleReport);

    expect(xml).toContain('&lt;special&gt; chars &amp; XML quotes &quot;val&quot;');
    expect(xml).toContain('&lt;foo&gt; &amp; &quot;bar&quot;');
    expect(xml).not.toContain('<foo>');
  });

  it('supports custom testsuite name option', () => {
    const reporter = new JunitReporter({ suiteName: 'custom-suite' });
    const xml = reporter.format(sampleReport);

    expect(xml).toContain('<testsuites name="custom-suite"');
  });

  it('formats missing output as an error tag', () => {
    const reportWithMissing: EvaluationReport = {
      ...sampleReport,
      cases: [
        {
          caseId: 'test-missing',
          status: 'ERROR',
          assertions: [],
          passedAssertions: 0,
          failedAssertions: 0,
          errorAssertions: 1,
          durationMs: 10,
          failureMessages: ['Missing'],
          missingOutput: true,
        },
      ],
    };

    const reporter = new JunitReporter();
    const xml = reporter.format(reportWithMissing);

    expect(xml).toContain('<error message="Output missing in fixture" type="MissingOutputError">');
  });
});
