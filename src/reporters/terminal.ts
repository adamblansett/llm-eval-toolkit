import pc from 'picocolors';
import type { EvaluationReport, CaseResult } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, TerminalReporterOptions } from './types.js';

export class TerminalReporter implements Reporter {
  private options: TerminalReporterOptions;

  constructor(options: TerminalReporterOptions = {}) {
    this.options = {
      colors: options.colors ?? true,
      verbose: options.verbose ?? false,
    };
  }

  public format(report: EvaluationReport, regression?: RegressionComparisonResult): string {
    const lines: string[] = [];
    const hr = '─'.repeat(54);

    lines.push('');
    lines.push(pc.bold(`LLM Eval Report: ${report.datasetName} (v${report.datasetVersion})`));
    lines.push(pc.dim(`Time: ${report.timestamp} | Duration: ${report.durationMs.toFixed(1)}ms`));
    lines.push(hr);

    // Summary block
    lines.push(pc.bold('Evaluation Summary:'));
    lines.push(`  Total cases:       ${report.totalCases}`);
    lines.push(
      `  Passed cases:      ${report.passedCases > 0 ? pc.green(String(report.passedCases)) : '0'}`,
    );
    if (report.failedCases > 0) {
      lines.push(`  Failed cases:      ${pc.red(String(report.failedCases))}`);
    } else {
      lines.push(`  Failed cases:      0`);
    }
    if (report.errorCases > 0) {
      lines.push(`  Error cases:       ${pc.yellow(String(report.errorCases))}`);
    }
    if (report.skippedCases > 0) {
      lines.push(`  Skipped cases:     ${pc.dim(String(report.skippedCases))}`);
    }

    const rateColor =
      report.passRate === 100 ? pc.green : report.passRate >= 80 ? pc.yellow : pc.red;
    lines.push(`  Pass rate:         ${rateColor(`${report.passRate.toFixed(1)}%`)}`);

    lines.push('');
    lines.push(pc.bold('Assertions:'));
    lines.push(
      `  Total: ${report.assertionTotals.total} | Passed: ${pc.green(String(report.assertionTotals.passed))} | Failed: ${report.assertionTotals.failed > 0 ? pc.red(String(report.assertionTotals.failed)) : '0'} | Errors: ${report.assertionTotals.errors > 0 ? pc.yellow(String(report.assertionTotals.errors)) : '0'}`,
    );

    // Failures block
    const failedCases = report.cases.filter((c) => c.status === 'FAILED' || c.status === 'ERROR');

    if (failedCases.length > 0) {
      lines.push('');
      lines.push(hr);
      lines.push(pc.bold(pc.red(`Failures & Errors (${failedCases.length}):`)));

      for (const fc of failedCases) {
        this.formatFailedCase(fc, lines);
      }
    } else if (this.options.verbose) {
      lines.push('');
      lines.push(hr);
      lines.push(pc.green('All cases passed successfully.'));
    }

    // Regression block
    if (regression) {
      lines.push('');
      lines.push(hr);
      lines.push(pc.bold(`Regression Comparison (${regression.policy}):`));
      lines.push(`  Baseline created:  ${pc.dim(regression.baselineCreatedAt)}`);
      lines.push(`  Baseline cases:    ${regression.totalCasesBaseline}`);
      lines.push(`  Current cases:     ${regression.totalCasesCurrent}`);

      if (regression.newlyFailingCases.length > 0) {
        lines.push(
          pc.red(
            `  ✗ Newly failing:   ${regression.newlyFailingCases.length} (${regression.newlyFailingCases.join(', ')})`,
          ),
        );
      } else {
        lines.push(pc.green('  ✓ Newly failing:   0'));
      }

      if (regression.recoveredCases.length > 0) {
        lines.push(
          pc.green(
            `  ✓ Recovered:       ${regression.recoveredCases.length} (${regression.recoveredCases.join(', ')})`,
          ),
        );
      }

      if (regression.addedCases.length > 0) {
        lines.push(
          pc.cyan(
            `  + Added cases:     ${regression.addedCases.length} (${regression.addedCases.join(', ')})`,
          ),
        );
      }

      if (regression.removedCases.length > 0) {
        lines.push(
          pc.yellow(
            `  - Removed cases:   ${regression.removedCases.length} (${regression.removedCases.join(', ')})`,
          ),
        );
      }

      if (regression.isRegression) {
        lines.push('');
        lines.push(pc.bold(pc.red('Regression Policy Violations:')));
        for (const violation of regression.policyViolations) {
          lines.push(`  - ${pc.red(violation)}`);
        }
      }
    }

    // Overall Status
    lines.push(hr);
    if (regression?.isRegression) {
      lines.push(pc.bold(pc.red('Result: REGRESSION DETECTED')));
    } else if (report.status === 'PASSED') {
      lines.push(pc.bold(pc.green('Result: PASSED')));
    } else if (report.status === 'ERROR') {
      lines.push(pc.bold(pc.yellow('Result: ERROR (Infrastructure or missing outputs)')));
    } else {
      lines.push(pc.bold(pc.red('Result: FAILED')));
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatFailedCase(fc: CaseResult, lines: string[]): void {
    const icon = fc.status === 'ERROR' ? pc.yellow('⚠') : pc.red('✗');
    const desc = fc.description ? pc.dim(` - ${fc.description}`) : '';
    lines.push(`\n${icon} ${pc.bold(fc.caseId)}${desc}`);

    if (fc.missingOutput) {
      lines.push(`    ${pc.yellow('Output missing in fixtures')}`);
      return;
    }

    for (const assertion of fc.assertions) {
      if (assertion.status === 'FAILED') {
        lines.push(`    ${pc.red('•')} [${assertion.assertionType}]: ${assertion.message}`);
        if (assertion.diagnostics?.diff && typeof assertion.diagnostics.diff === 'string') {
          lines.push(pc.dim('    Diff:'));
          for (const dLine of assertion.diagnostics.diff.split('\n')) {
            const formattedLine = dLine.startsWith('+')
              ? pc.green(`      ${dLine}`)
              : dLine.startsWith('-')
                ? pc.red(`      ${dLine}`)
                : pc.dim(`      ${dLine}`);
            lines.push(formattedLine);
          }
        }
      } else if (assertion.status === 'ERROR') {
        lines.push(
          `    ${pc.yellow('•')} [${assertion.assertionType} ERROR]: ${assertion.message}`,
        );
      }
    }
  }
}
