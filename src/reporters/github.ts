import fs from 'node:fs';
import type { EvaluationReport } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, GitHubReporterOptions } from './types.js';
import { MarkdownReporter } from './markdown.js';
import { TerminalReporter } from './terminal.js';

/**
 * Escapes characters in GitHub Actions workflow command properties according to official specifications.
 */
export function escapeWorkflowProperty(val: string): string {
  return val
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

/**
 * Escapes characters in GitHub Actions workflow command message data.
 */
export function escapeWorkflowData(val: string): string {
  return val.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

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

    // 1. Emit GitHub workflow commands (annotations) with proper escaping
    for (const c of report.cases) {
      if (c.missingOutput) {
        const title = escapeWorkflowProperty(`Missing Output (${c.caseId})`);
        const msg = escapeWorkflowData(
          `Case "${c.caseId}" has no matching output in outputs fixture`,
        );
        lines.push(`::error title=${title}::${msg}`);
      } else if (c.status === 'FAILED') {
        const title = escapeWorkflowProperty(`Evaluation Failed (${c.caseId})`);
        const msg = escapeWorkflowData(c.failureMessages.join(' | '));
        lines.push(`::error title=${title}::${msg}`);
      } else if (c.status === 'ERROR') {
        const title = escapeWorkflowProperty(`Evaluation Error (${c.caseId})`);
        const msg = escapeWorkflowData(c.failureMessages.join(' | '));
        lines.push(`::error title=${title}::${msg}`);
      }
    }

    if (regression?.isRegression) {
      const title = escapeWorkflowProperty(`Regression Detected (${regression.policy})`);
      const regMsg = escapeWorkflowData(regression.policyViolations.join(' | '));
      lines.push(`::error title=${title}::${regMsg}`);
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
