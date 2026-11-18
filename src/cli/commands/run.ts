import fs from 'node:fs';
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
import { MarkdownReporter } from '../../reporters/markdown.js';
import { JunitReporter } from '../../reporters/junit.js';
import { GitHubReporter } from '../../reporters/github.js';
import type { Reporter } from '../../reporters/types.js';
import { writeFileAtomic } from '../../utils/fs.js';
import { resolveSafePath } from '../../utils/path.js';
import { ExitCode } from '../../config/exit-codes.js';
import { loadConfigFile, loadEvaluatorsFromPaths } from '../../config/loader.js';
import { EvaluatorRegistry, defaultEvaluatorRegistry } from '../../evaluators/registry.js';
import type { RegressionPolicy } from '../../regression/types.js';

function getReporter(reporterType: string): Reporter {
  switch (reporterType.toLowerCase()) {
    case 'json':
      return new JsonReporter();
    case 'markdown':
      return new MarkdownReporter();
    case 'junit':
      return new JunitReporter();
    case 'github':
      return new GitHubReporter();
    case 'terminal':
    default:
      return new TerminalReporter();
  }
}

export function createRunCommand(): Command {
  return new Command('run')
    .description('Run an evaluation dataset against an outputs fixture')
    .argument('<dataset>', 'Path to dataset JSON or JSONL file')
    .requiredOption('-o, --outputs <path>', 'Path to outputs JSON or JSONL file')
    .option(
      '-r, --reporter <type>',
      'Reporter format: "terminal", "json", "markdown", "junit", or "github"',
      'terminal',
    )
    .option('--output <path>', 'Save report output to specified file path')
    .option('--save-baseline <path>', 'Save the evaluation results as a baseline file')
    .option('--compare-baseline <path>', 'Compare results with an existing baseline file')
    .option(
      '-u, --update-baseline [path]',
      'Update baseline file in-place with current results (or path to baseline file)',
    )
    .option(
      '--regression-policy <policy>',
      'Policy for baseline comparison: "fail-on-regression", "fail-on-any-failure", or "strict"',
      'fail-on-regression',
    )
    .option('-t, --tag <tags...>', 'Filter evaluation cases by one or more tags')
    .option(
      '-g, --grep <pattern>',
      'Filter evaluation cases by regex pattern matching ID or description',
    )
    .option('-e, --evaluator <paths...>', 'Path(s) to custom evaluator files to load')
    .option('-c, --config <path>', 'Path to configuration file (e.g. llm-eval.config.js)')
    .option(
      '--watch',
      'Watch dataset and outputs files for changes and re-run automatically',
      false,
    )
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .option('--debug', 'Show full stack traces on unexpected errors', false)
    .action(async (datasetPath: string, options) => {
      // 1. Load config file if present
      const config = await loadConfigFile(options.config);

      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : config?.maxFileSize;

      const reporterType =
        options.reporter !== 'terminal'
          ? options.reporter
          : (config?.defaultReporter ?? 'terminal');

      const regressionPolicy = (
        options.regressionPolicy !== 'fail-on-regression'
          ? options.regressionPolicy
          : (config?.defaultBaselinePolicy ?? 'fail-on-regression')
      ) as RegressionPolicy;

      // 2. Set up evaluator registry
      let registry = defaultEvaluatorRegistry;
      const customEvaluatorPaths: string[] = options.evaluator ?? [];
      const hasCustomEvaluators =
        customEvaluatorPaths.length > 0 || (config?.evaluators && config.evaluators.length > 0);

      if (hasCustomEvaluators) {
        registry = new EvaluatorRegistry();
        if (config?.evaluators) {
          for (const ev of config.evaluators) {
            registry.register(ev);
          }
        }
        if (customEvaluatorPaths.length > 0) {
          const loaded = await loadEvaluatorsFromPaths(customEvaluatorPaths);
          for (const ev of loaded) {
            registry.register(ev);
          }
        }
      }

      const executeEval = async (): Promise<number> => {
        const dataset = await loadDataset(datasetPath, { maxSizeBytes });
        const outputs = await loadOutputs(options.outputs, { maxSizeBytes });

        const report = await runEvaluation(dataset, outputs, {
          registry,
          tags: options.tag,
          grep: options.grep,
        });

        let regressionResult;
        const baselinePath =
          options.compareBaseline ?? (options.updateBaseline ? options.saveBaseline : undefined);

        if (baselinePath) {
          try {
            const baseline = await loadBaseline(baselinePath, { maxSizeBytes });
            regressionResult = compareEvaluationWithBaseline(report, baseline, regressionPolicy);
          } catch (err) {
            if (!options.updateBaseline) {
              throw err;
            }
          }
        }

        const baselineSaveTarget =
          options.saveBaseline ??
          (typeof options.updateBaseline === 'string'
            ? options.updateBaseline
            : options.updateBaseline
              ? options.compareBaseline
              : undefined);
        if (baselineSaveTarget) {
          const baselineData = createBaselineFromReport(report);
          await saveBaseline(baselineSaveTarget, baselineData);
        }

        const reporter = getReporter(reporterType);
        const outputText = reporter.format(report, regressionResult);

        const outPath = options.output ?? config?.output;
        if (outPath) {
          await writeFileAtomic(resolveSafePath(outPath), outputText);
        } else {
          process.stdout.write(outputText + '\n');
        }

        if (regressionResult?.isRegression) {
          return ExitCode.REGRESSION_DETECTED;
        }

        if (report.status !== 'PASSED') {
          return ExitCode.EVALUATION_FAILED;
        }

        return ExitCode.SUCCESS;
      };

      if (options.watch) {
        process.stdout.write(pc.cyan('\nStarting llm-eval in watch mode...\n'));
        const filesToWatch = [resolveSafePath(datasetPath), resolveSafePath(options.outputs)];
        if (options.compareBaseline) {
          filesToWatch.push(resolveSafePath(options.compareBaseline));
        }

        let isRunning = false;
        const runOnce = async () => {
          if (isRunning) return;
          isRunning = true;
          try {
            process.stdout.write('\x1Bc'); // clear console
            process.stdout.write(
              pc.dim(`[${new Date().toLocaleTimeString()}] Running evaluation...\n`),
            );
            await executeEval();
          } catch (err: unknown) {
            const error = err as Error;
            process.stderr.write(pc.red(`\nEvaluation failed with error: ${error.message}\n`));
          } finally {
            isRunning = false;
            process.stdout.write(pc.dim('\nWaiting for file changes... (Press Ctrl+C to exit)\n'));
          }
        };

        await runOnce();

        for (const file of filesToWatch) {
          if (fs.existsSync(file)) {
            fs.watch(file, () => {
              void runOnce();
            });
          }
        }

        // Keep process open
        await new Promise(() => {});
        return;
      }

      const exitCode = await executeEval();
      process.exit(exitCode);
    });
}
