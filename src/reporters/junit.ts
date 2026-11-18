import type { EvaluationReport } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, JunitReporterOptions } from './types.js';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class JunitReporter implements Reporter {
  private options: JunitReporterOptions;

  constructor(options: JunitReporterOptions = {}) {
    this.options = {
      suiteName: options.suiteName ?? 'llm-eval',
    };
  }

  public format(report: EvaluationReport, _regression?: RegressionComparisonResult): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    const totalDurationSec = (report.durationMs / 1000).toFixed(4);

    lines.push(
      `<testsuites name="${escapeXml(this.options.suiteName ?? 'llm-eval')}" tests="${report.totalCases}" failures="${report.failedCases}" errors="${report.errorCases}" time="${totalDurationSec}">`,
    );

    lines.push(
      `  <testsuite name="${escapeXml(report.datasetName)}" tests="${report.totalCases}" failures="${report.failedCases}" errors="${report.errorCases}" skipped="${report.skippedCases}" time="${totalDurationSec}" timestamp="${escapeXml(report.timestamp)}">`,
    );

    for (const c of report.cases) {
      const caseDurationSec = (c.durationMs / 1000).toFixed(4);
      const caseName = c.description
        ? `${escapeXml(c.caseId)} - ${escapeXml(c.description)}`
        : escapeXml(c.caseId);

      lines.push(
        `    <testcase name="${caseName}" classname="${escapeXml(report.datasetName)}" time="${caseDurationSec}">`,
      );

      if (c.missingOutput) {
        lines.push(
          `      <error message="Output missing in fixture" type="MissingOutputError">Case "${escapeXml(c.caseId)}" has no output in the outputs fixture</error>`,
        );
      } else if (c.status === 'FAILED') {
        const failureText = c.failureMessages.map((m) => escapeXml(m)).join('\n');
        lines.push(
          `      <failure message="Evaluation assertions failed" type="AssertionFailure">${failureText}</failure>`,
        );
      } else if (c.status === 'ERROR') {
        const errorText = c.failureMessages.map((m) => escapeXml(m)).join('\n');
        lines.push(
          `      <error message="Evaluation execution error" type="EvaluationError">${errorText}</error>`,
        );
      }

      lines.push('    </testcase>');
    }

    lines.push('  </testsuite>');
    lines.push('</testsuites>');

    return lines.join('\n');
  }
}
