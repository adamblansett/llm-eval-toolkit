import fs from 'node:fs';
import type { EvaluationReport } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, GitHubReporterOptions } from './types.js';
import { MarkdownReporter } from './markdown.js';
import { TerminalReporter } from './terminal.js';

export class GitHubReporter implements Reporter {
  private options: GitHubReporterOptions;
  private markdownReporter: MarkdownReporter;
  private terminalReporter: TerminalReporter;

  constructor(options: GitHubReporterOptions = {}) {
    this.options = {
      writeStepSummary: options.writeStepSummary ?? true,
    };
    this.markdownReporter = new MarkdownReporter();
    this.terminalReporter = new TerminalReporter({ colors: true });
  }

  public format(report: EvaluationReport, regression?: RegressionComparisonResult): string {
    const lines: string[] = [];

    // 1. Emit GitHub workflow commands (annotations)
    for (const c of report.cases) {
      if (c.missingOutput) {
        lines.push(
          `::error title=Missing Output (${c.caseId})::Case "${c.caseId}" has no matching output in outputs fixture`,
        );
      } else if (c.status === 'FAILED') {
        const msg = c.failureMessages.join(' | ').replace(/\r?\n/g, ' ');
        lines.push(`::error title=Evaluation Failed (${c.caseId})::${msg}`);
      } else if (c.status === 'ERROR') {
        const msg = c.failureMessages.join(' | ').replace(/\r?\n/g, ' ');
        lines.push(`::error title=Evaluation Error (${c.caseId})::${msg}`);
      }
    }

    if (regression?.isRegression) {
      const regMsg = regression.policyViolations.join(' | ').replace(/\r?\n/g, ' ');
      lines.push(`::error title=Regression Detected (${regression.policy})::${regMsg}`);
    }

    // 2. Write Markdown to GITHUB_STEP_SUMMARY if available
    const mdContent = this.markdownReporter.format(report, regression);
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;

    if (this.options.writeStepSummary && summaryFile) {
      try {
        fs.appendFileSync(summaryFile, `\n${mdContent}\n`, 'utf-8');
      } catch {
        // Ignore file writing error in sandboxed or read-only environments
      }
    }

    // 3. Output console-friendly output with workflow commands at the top
    const terminalOutput = this.terminalReporter.format(report, regression);
    lines.push(terminalOutput);

    return lines.join('\n');
  }
}
