#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import pc from 'picocolors';
import { createRunCommand } from './commands/run.js';
import { createBaselineCommand } from './commands/baseline.js';
import { DatasetValidationError } from '../datasets/validator.js';
import { OutputFixtureError } from '../datasets/loader.js';
import { BaselineFormatError } from '../regression/storage.js';
import { IncompatibleBaselineError } from '../regression/comparator.js';
import { FileReadError } from '../utils/fs.js';
import { PathSecurityError } from '../utils/path.js';
import { ExitCode } from '../config/exit-codes.js';

export function createProgram(): Command {
  const program = new Command('llm-eval');

  program
    .version('0.1.0')
    .description(
      'Developer-focused, contract-based evaluation framework and regression detection for AI application outputs',
    );

  program.addCommand(createRunCommand());
  program.addCommand(createBaselineCommand());

  return program;
}

export async function main(args: string[] = process.argv): Promise<void> {
  const program = createProgram();
  program.exitOverride();

  const isDebug = args.includes('--debug');

  try {
    await program.parseAsync(args);
  } catch (err: unknown) {
    if (err instanceof CommanderError) {
      // Help and version flags exit with code 0
      if (err.exitCode === 0) {
        process.exit(ExitCode.SUCCESS);
      }
      process.stderr.write(pc.red(`Error: ${err.message}\n`));
      process.exit(ExitCode.CONFIG_OR_DATASET_ERROR);
    }

    if (
      err instanceof DatasetValidationError ||
      err instanceof OutputFixtureError ||
      err instanceof BaselineFormatError ||
      err instanceof IncompatibleBaselineError ||
      err instanceof FileReadError ||
      err instanceof PathSecurityError
    ) {
      process.stderr.write(pc.red(`Error: ${err.message}\n`));
      if (isDebug && err.stack) {
        process.stderr.write(pc.dim(err.stack + '\n'));
      }
      process.exit(ExitCode.CONFIG_OR_DATASET_ERROR);
    }

    const error = err as Error;
    process.stderr.write(pc.red(`Runtime Error: ${error.message}\n`));
    if (isDebug && error.stack) {
      process.stderr.write(pc.dim(error.stack + '\n'));
    }
    process.exit(ExitCode.RUNTIME_ERROR);
  }
}

// Only invoke automatically when run as the CLI entrypoint
if (
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith('llm-eval'))
) {
  void main();
}
