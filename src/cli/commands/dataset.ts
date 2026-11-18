import { Command } from 'commander';
import pc from 'picocolors';
import { loadDataset } from '../../datasets/loader.js';
import { ExitCode } from '../../config/exit-codes.js';

export function createDatasetCommand(): Command {
  const datasetCmd = new Command('dataset').description('Validate and inspect evaluation datasets');

  datasetCmd
    .command('validate')
    .description('Validate dataset structure, schema compliance, and assertions')
    .argument('<dataset>', 'Path to dataset JSON or JSONL file')
    .option('--max-file-size <bytes>', 'Maximum allowed file size in bytes')
    .action(async (datasetPath: string, options) => {
      const maxSizeBytes = options.maxFileSize ? Number(options.maxFileSize) : undefined;
      const dataset = await loadDataset(datasetPath, { maxSizeBytes });

      const assertionCounts: Record<string, number> = {};
      const tagSet = new Set<string>();

      for (const c of dataset.cases) {
        if (c.tags) {
          for (const t of c.tags) {
            tagSet.add(t);
          }
        }
        for (const a of c.assertions) {
          assertionCounts[a.type] = (assertionCounts[a.type] ?? 0) + 1;
        }
      }

      process.stdout.write('\n' + pc.bold(pc.green('✓ Dataset is valid!')) + '\n\n');
      process.stdout.write(`  Name:        ${pc.cyan(dataset.name)}\n`);
      process.stdout.write(`  Version:     ${dataset.version}\n`);
      if (dataset.description) {
        process.stdout.write(`  Description: ${pc.dim(dataset.description)}\n`);
      }
      process.stdout.write(`  Total Cases: ${dataset.cases.length}\n`);

      if (tagSet.size > 0) {
        process.stdout.write(
          `  Tags (${tagSet.size}):   ${Array.from(tagSet).sort().join(', ')}\n`,
        );
      }

      process.stdout.write('\n' + pc.bold('Assertion Breakdown:') + '\n');
      for (const [type, count] of Object.entries(assertionCounts).sort()) {
        process.stdout.write(`  • ${type.padEnd(20)}: ${count}\n`);
      }
      process.stdout.write('\n');

      process.exit(ExitCode.SUCCESS);
    });

  return datasetCmd;
}
