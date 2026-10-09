import { Command } from 'commander';
import { loadDataset, loadOutputs } from '../../datasets/loader.js';
import { runEvaluation } from '../../runner/runner.js';
import {
  loadBaseline,
  saveBaseline,
  createBaselineFromReport,
  compareEvaluationWithBaseline,
} from '../../regression/index.js';
import { TerminalReporter } from '../../reporters/terminal.js';
import { JsonReporter } from '../../reporters/json.js';
import { writeFileAtomic } from '../../utils/fs.js';
import { resolveSafePath } from '../../utils/path.js';
import { ExitCode } from '../../config/exit-codes.js';
import type { RegressionPolicy } from '../../regression/types.js';

export function createRunCommand(): Command {
  return new Command('run')
    .description('Run an evaluation dataset against an outputs fixture')
    .argument('<dataset>', 'Path to dataset JSON file')
    .requiredOption('-o, --outputs <path>', 'Path to outputs JSON file')
    .option('-r, --reporter <type>', 'Reporter format: "terminal" or "json"', 'terminal')
    .option('--output <path>', 'Save report output to specified file path')
    .option('--save-baseline <path>', 'Save the evaluation results as a baseline file')
    .option('--compare-baseline <path>', 'Compare results with an existing baseline file')
    .option(
      '--regression-policy <policy>',
      'Policy for baseline comparison: "fail-on-regression", "fail-on-any-failure", or "strict"',
      'fail-on-regression',
    )
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .option('--debug', 'Show full stack traces on unexpected errors', false)
    .action(async (datasetPath: string, options) => {
      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : undefined;

      const dataset = await loadDataset(datasetPath, { maxSizeBytes });
      const outputs = await loadOutputs(options.outputs, { maxSizeBytes });

      const report = await runEvaluation(dataset, outputs);

      let regressionResult;
      if (options.compareBaseline) {
        const baseline = await loadBaseline(options.compareBaseline, { maxSizeBytes });
        regressionResult = compareEvaluationWithBaseline(
          report,
          baseline,
          options.regressionPolicy as RegressionPolicy,
        );
      }

      if (options.saveBaseline) {
        const baselineData = createBaselineFromReport(report);
        await saveBaseline(options.saveBaseline, baselineData);
      }

      const reporter = options.reporter === 'json' ? new JsonReporter() : new TerminalReporter();

      const outputText = reporter.format(report, regressionResult);

      if (options.output) {
        await writeFileAtomic(resolveSafePath(options.output), outputText);
      } else {
        process.stdout.write(outputText + '\n');
      }

      // Determine exit code
      if (regressionResult?.isRegression) {
        process.exit(ExitCode.REGRESSION_DETECTED);
      }

      if (report.status !== 'PASSED') {
        process.exit(ExitCode.EVALUATION_FAILED);
      }

      process.exit(ExitCode.SUCCESS);
    });
}
