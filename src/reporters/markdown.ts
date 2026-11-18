import type { EvaluationReport, CaseResult } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, MarkdownReporterOptions } from './types.js';

export class MarkdownReporter implements Reporter {
  private options: MarkdownReporterOptions;

  constructor(options: MarkdownReporterOptions = {}) {
    this.options = {
      includeDetails: options.includeDetails ?? true,
    };
  }

  public format(report: EvaluationReport, regression?: RegressionComparisonResult): string {
    const lines: string[] = [];

    const statusBadge = regression?.isRegression
      ? '🛑 **REGRESSION DETECTED**'
      : report.status === 'PASSED'
        ? '✅ **PASSED**'
        : report.status === 'ERROR'
          ? '⚠️ **ERROR**'
          : '❌ **FAILED**';

    lines.push(`# LLM Eval Report: ${report.datasetName} (v${report.datasetVersion})`);
    lines.push('');
    lines.push(`- **Status:** ${statusBadge}`);
    lines.push(`- **Execution Time:** \`${report.timestamp}\``);
    lines.push(`- **Duration:** \`${report.durationMs.toFixed(1)}ms\``);
    lines.push('');

    // Summary table
    lines.push('## Evaluation Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('| :--- | :--- |');
    lines.push(`| **Total Cases** | \`${report.totalCases}\` |`);
    lines.push(`| **Passed Cases** | \`${report.passedCases}\` |`);
    lines.push(`| **Failed Cases** | \`${report.failedCases}\` |`);
    lines.push(`| **Error Cases** | \`${report.errorCases}\` |`);
    if (report.skippedCases > 0) {
      lines.push(`| **Skipped Cases** | \`${report.skippedCases}\` |`);
    }
    lines.push(`| **Pass Rate** | **\`${report.passRate.toFixed(1)}%\`** |`);
    lines.push(
      `| **Assertions** | Total: \`${report.assertionTotals.total}\` (Passed: \`${report.assertionTotals.passed}\`, Failed: \`${report.assertionTotals.failed}\`, Errors: \`${report.assertionTotals.errors}\`) |`,
    );
    lines.push('');

    // Regression section
    if (regression) {
      lines.push(`## Regression Comparison (\`${regression.policy}\`)`);
      lines.push('');
      lines.push(`- **Baseline Created At:** \`${regression.baselineCreatedAt}\``);
      lines.push(`- **Baseline Cases:** \`${regression.totalCasesBaseline}\``);
      lines.push(`- **Current Cases:** \`${regression.totalCasesCurrent}\``);
      lines.push(
        `- **Newly Failing:** \`${regression.newlyFailingCases.length}\`${
          regression.newlyFailingCases.length > 0
            ? ` (\`${regression.newlyFailingCases.join('`, `')}\`)`
            : ''
        }`,
      );
      lines.push(
        `- **Recovered:** \`${regression.recoveredCases.length}\`${
          regression.recoveredCases.length > 0
            ? ` (\`${regression.recoveredCases.join('`, `')}\`)`
            : ''
        }`,
      );

      if (regression.addedCases.length > 0) {
        lines.push(
          `- **Added Cases:** \`${regression.addedCases.length}\` (\`${regression.addedCases.join('`, `')}\`)`,
        );
      }
      if (regression.removedCases.length > 0) {
        lines.push(
          `- **Removed Cases:** \`${regression.removedCases.length}\` (\`${regression.removedCases.join('`, `')}\`)`,
        );
      }

      if (regression.isRegression) {
        lines.push('');
        lines.push('### ⚠️ Regression Policy Violations');
        for (const violation of regression.policyViolations) {
          lines.push(`- ${violation}`);
        }
      }
      lines.push('');
    }

    // Failures block
    const failedCases = report.cases.filter((c) => c.status === 'FAILED' || c.status === 'ERROR');

    if (failedCases.length > 0 && this.options.includeDetails) {
      lines.push(`## Failures & Errors (${failedCases.length})`);
      lines.push('');

      for (const fc of failedCases) {
        this.formatFailedCase(fc, lines);
      }
    }

    return lines.join('\n');
  }

  private formatFailedCase(fc: CaseResult, lines: string[]): void {
    const icon = fc.status === 'ERROR' ? '⚠️' : '❌';
    const title = `${icon} Case \`${fc.caseId}\`${fc.description ? `: ${fc.description}` : ''}`;

    lines.push('<details>');
    lines.push(`<summary><strong>${title}</strong></summary>`);
    lines.push('');

    if (fc.missingOutput) {
      lines.push('> **Output Missing:** Output was not provided in the outputs fixture.');
    } else {
      lines.push('**Assertion Results:**');
      for (const a of fc.assertions) {
        if (a.status === 'FAILED') {
          lines.push(`- ❌ **\`[${a.assertionType}]\`**: ${a.message}`);
          if (a.diagnostics?.diff && typeof a.diagnostics.diff === 'string') {
            lines.push('');
            lines.push('```diff');
            lines.push(a.diagnostics.diff);
            lines.push('```');
          }
        } else if (a.status === 'ERROR') {
          lines.push(`- ⚠️ **\`[${a.assertionType} ERROR]\`**: ${a.message}`);
        }
      }
    }

    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
}
