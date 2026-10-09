import { Command } from 'commander';
import pc from 'picocolors';
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

export function createBaselineCommand(): Command {
  const baselineCmd = new Command('baseline').description(
    'Manage evaluation baselines and detect regressions',
  );

  baselineCmd
    .command('create')
    .description('Create and save an evaluation baseline from a dataset and output fixture')
    .argument('<dataset>', 'Path to dataset JSON file')
    .requiredOption('-o, --outputs <path>', 'Path to outputs JSON file')
    .requiredOption('--output <path>', 'Path where baseline file will be saved')
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .option('--debug', 'Show full stack traces on unexpected errors', false)
    .action(async (datasetPath: string, options) => {
      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : undefined;
      const dataset = await loadDataset(datasetPath, { maxSizeBytes });
      const outputs = await loadOutputs(options.outputs, { maxSizeBytes });

      const report = await runEvaluation(dataset, outputs);
      const baseline = createBaselineFromReport(report);
      await saveBaseline(options.output, baseline);

      process.stdout.write(
        pc.green(
          `✓ Baseline successfully saved to ${options.output} (${Object.keys(baseline.cases).length} cases)\n`,
        ),
      );
      process.exit(ExitCode.SUCCESS);
    });

  baselineCmd
    .command('compare')
    .description('Compare an evaluation run against an existing baseline')
    .argument('<dataset>', 'Path to dataset JSON file')
    .requiredOption('-o, --outputs <path>', 'Path to outputs JSON file')
    .requiredOption('-b, --baseline <path>', 'Path to existing baseline JSON file')
    .option(
      '-p, --policy <policy>',
      'Regression policy: "fail-on-regression", "fail-on-any-failure", or "strict"',
      'fail-on-regression',
    )
    .option('-r, --reporter <type>', 'Reporter format: "terminal" or "json"', 'terminal')
    .option('--output <path>', 'Save output report to specified file path')
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .option('--debug', 'Show full stack traces on unexpected errors', false)
    .action(async (datasetPath: string, options) => {
      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : undefined;
      const dataset = await loadDataset(datasetPath, { maxSizeBytes });
      const outputs = await loadOutputs(options.outputs, { maxSizeBytes });
      const baseline = await loadBaseline(options.baseline, { maxSizeBytes });

      const report = await runEvaluation(dataset, outputs);
      const regressionResult = compareEvaluationWithBaseline(
        report,
        baseline,
        options.policy as RegressionPolicy,
      );

      const reporter = options.reporter === 'json' ? new JsonReporter() : new TerminalReporter();

      const outputText = reporter.format(report, regressionResult);

      if (options.output) {
        await writeFileAtomic(resolveSafePath(options.output), outputText);
      } else {
        process.stdout.write(outputText + '\n');
      }

      if (regressionResult.isRegression) {
        process.exit(ExitCode.REGRESSION_DETECTED);
      }

      if (report.status !== 'PASSED') {
        process.exit(ExitCode.EVALUATION_FAILED);
      }

      process.exit(ExitCode.SUCCESS);
    });

  baselineCmd
    .command('inspect')
    .description('Inspect and validate a saved baseline file')
    .argument('<baseline>', 'Path to baseline JSON file')
    .option('-r, --reporter <type>', 'Format: "terminal" or "json"', 'terminal')
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .option('--debug', 'Show full stack traces on unexpected errors', false)
    .action(async (baselinePath: string, options) => {
      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : undefined;
      const baseline = await loadBaseline(baselinePath, { maxSizeBytes });

      if (options.reporter === 'json') {
        process.stdout.write(JSON.stringify(baseline, null, 2) + '\n');
        process.exit(ExitCode.SUCCESS);
      }

      const caseEntries = Object.entries(baseline.cases);
      const passedCount = caseEntries.filter(([, c]) => c.status === 'PASSED').length;
      const failedCount = caseEntries.filter(([, c]) => c.status === 'FAILED').length;
      const errorCount = caseEntries.filter(([, c]) => c.status === 'ERROR').length;

      process.stdout.write('\n' + pc.bold('Baseline Inspection:') + '\n');
      process.stdout.write(`  Dataset Name:     ${pc.cyan(baseline.datasetName)}\n`);
      process.stdout.write(`  Dataset Version:  ${baseline.datasetVersion}\n`);
      process.stdout.write(`  Baseline Version: ${baseline.baselineVersion}\n`);
      process.stdout.write(`  Created At:       ${baseline.createdAt}\n`);
      process.stdout.write(`  Total Cases:      ${caseEntries.length}\n`);
      process.stdout.write(
        `  Case Breakdown:   ${pc.green(`${passedCount} passed`)}, ${pc.red(`${failedCount} failed`)}, ${pc.yellow(`${errorCount} errors`)}\n\n`,
      );

      process.exit(ExitCode.SUCCESS);
    });

  return baselineCmd;
}
