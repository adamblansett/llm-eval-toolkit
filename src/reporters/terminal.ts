import pc from 'picocolors';
import type { EvaluationReport, CaseResult } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, TerminalReporterOptions } from './types.js';

const identity = (text: string): string => text;

const noColorPalette = {
  bold: identity,
  dim: identity,
  green: identity,
  red: identity,
  yellow: identity,
  cyan: identity,
};

export class TerminalReporter implements Reporter {
  private options: TerminalReporterOptions;

  constructor(options: TerminalReporterOptions = {}) {
    this.options = {
      colors: options.colors ?? true,
      verbose: options.verbose ?? false,
    };
  }

  private get color() {
    return this.options.colors ? pc : noColorPalette;
  }

  public format(report: EvaluationReport, regression?: RegressionComparisonResult): string {
    const c = this.color;
    const lines: string[] = [];
    const hr = '─'.repeat(54);

    lines.push('');
    lines.push(c.bold(`LLM Eval Report: ${report.datasetName} (v${report.datasetVersion})`));
    lines.push(c.dim(`Time: ${report.timestamp} | Duration: ${report.durationMs.toFixed(1)}ms`));
    lines.push(hr);

    // Summary block
    lines.push(c.bold('Evaluation Summary:'));
    lines.push(`  Total cases:       ${report.totalCases}`);
    lines.push(
      `  Passed cases:      ${report.passedCases > 0 ? c.green(String(report.passedCases)) : '0'}`,
    );
    if (report.failedCases > 0) {
      lines.push(`  Failed cases:      ${c.red(String(report.failedCases))}`);
    } else {
      lines.push(`  Failed cases:      0`);
    }
    if (report.errorCases > 0) {
      lines.push(`  Error cases:       ${c.yellow(String(report.errorCases))}`);
    }
    if (report.skippedCases > 0) {
      lines.push(`  Skipped cases:     ${c.dim(String(report.skippedCases))}`);
    }

    const rateColor = report.passRate === 100 ? c.green : report.passRate >= 80 ? c.yellow : c.red;
    lines.push(`  Pass rate:         ${rateColor(`${report.passRate.toFixed(1)}%`)}`);

    lines.push('');
    lines.push(c.bold('Assertions:'));
    lines.push(
      `  Total: ${report.assertionTotals.total} | Passed: ${c.green(String(report.assertionTotals.passed))} | Failed: ${report.assertionTotals.failed > 0 ? c.red(String(report.assertionTotals.failed)) : '0'} | Errors: ${report.assertionTotals.errors > 0 ? c.yellow(String(report.assertionTotals.errors)) : '0'}`,
    );

    // Failures block
    const failedCases = report.cases.filter(
      (item) => item.status === 'FAILED' || item.status === 'ERROR',
    );

    if (failedCases.length > 0) {
      lines.push('');
      lines.push(hr);
      lines.push(c.bold(c.red(`Failures & Errors (${failedCases.length}):`)));

      for (const fc of failedCases) {
        this.formatFailedCase(fc, lines);
      }
    } else if (this.options.verbose) {
      lines.push('');
      lines.push(hr);
      lines.push(c.green('All cases passed successfully.'));
    }

    // Regression block
    if (regression) {
      lines.push('');
      lines.push(hr);
      lines.push(c.bold(`Regression Comparison (${regression.policy}):`));
      lines.push(`  Baseline created:  ${c.dim(regression.baselineCreatedAt)}`);
      lines.push(`  Baseline cases:    ${regression.totalCasesBaseline}`);
      lines.push(`  Current cases:     ${regression.totalCasesCurrent}`);

      if (regression.newlyFailingCases.length > 0) {
        lines.push(
          c.red(
            `  ✗ Newly failing:   ${regression.newlyFailingCases.length} (${regression.newlyFailingCases.join(', ')})`,
          ),
        );
      } else {
        lines.push(c.green('  ✓ Newly failing:   0'));
      }

      if (regression.recoveredCases.length > 0) {
        lines.push(
          c.green(
            `  ✓ Recovered:       ${regression.recoveredCases.length} (${regression.recoveredCases.join(', ')})`,
          ),
        );
      }

      if (regression.addedCases.length > 0) {
        lines.push(
          c.cyan(
            `  + Added cases:     ${regression.addedCases.length} (${regression.addedCases.join(', ')})`,
          ),
        );
      }

      if (regression.removedCases.length > 0) {
        lines.push(
          c.yellow(
            `  - Removed cases:   ${regression.removedCases.length} (${regression.removedCases.join(', ')})`,
          ),
        );
      }

      if (regression.isRegression) {
        lines.push('');
        lines.push(c.bold(c.red('Regression Policy Violations:')));
        for (const violation of regression.policyViolations) {
          lines.push(`  - ${c.red(violation)}`);
        }
      }
    }

    // Overall Status
    lines.push(hr);
    if (regression?.isRegression) {
      lines.push(c.bold(c.red('Result: REGRESSION DETECTED')));
    } else if (report.status === 'PASSED') {
      lines.push(c.bold(c.green('Result: PASSED')));
    } else if (report.status === 'ERROR') {
      lines.push(c.bold(c.yellow('Result: ERROR (Infrastructure or missing outputs)')));
    } else {
      lines.push(c.bold(c.red('Result: FAILED')));
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatFailedCase(fc: CaseResult, lines: string[]): void {
    const c = this.color;
    const icon = fc.status === 'ERROR' ? c.yellow('⚠') : c.red('✗');
    const desc = fc.description ? c.dim(` - ${fc.description}`) : '';
    lines.push(`\n${icon} ${c.bold(fc.caseId)}${desc}`);

    if (fc.missingOutput) {
      lines.push(`    ${c.yellow('Output missing in fixtures')}`);
      return;
    }

    for (const assertion of fc.assertions) {
      if (assertion.status === 'FAILED') {
        lines.push(`    ${c.red('•')} [${assertion.assertionType}]: ${assertion.message}`);
        if (assertion.diagnostics?.diff && typeof assertion.diagnostics.diff === 'string') {
          lines.push(c.dim('    Diff:'));
          for (const dLine of assertion.diagnostics.diff.split('\n')) {
            const formattedLine = dLine.startsWith('+')
              ? c.green(`      ${dLine}`)
              : dLine.startsWith('-')
                ? c.red(`      ${dLine}`)
                : c.dim(`      ${dLine}`);
            lines.push(formattedLine);
          }
        }
      } else if (assertion.status === 'ERROR') {
        lines.push(`    ${c.yellow('•')} [${assertion.assertionType} ERROR]: ${assertion.message}`);
      }
    }
  }
}
