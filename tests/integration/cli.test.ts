import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify, stripVTControlCharacters } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ExitCode } from '../../src/config/exit-codes.js';
import { writeFileAtomic } from '../../src/utils/fs.js';

const execFileAsync = promisify(execFile);
const cliEntry = path.resolve('dist/cli/index.js');

describe('CLI Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-eval-cli-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('prints help and exits with 0', async () => {
    const { stdout } = await execFileAsync('node', [cliEntry, '--help']);
    expect(stdout).toContain('Usage: llm-eval');
    expect(stdout).toContain('run [options] <dataset>');
    expect(stdout).toContain('baseline');
  });

  it('prints version and exits with 0', async () => {
    const { stdout } = await execFileAsync('node', [cliEntry, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  });

  it('runs a completely passing evaluation and exits with 0', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'cli-passing-eval',
        cases: [
          {
            id: 'c-1',
            input: 'hello',
            expected: 'world',
            assertions: [{ type: 'exact_match' }],
          },
        ],
      }),
    );

    await writeFileAtomic(
      outputsPath,
      JSON.stringify({
        'c-1': 'world',
      }),
    );

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
    ]);

    const plainStdout = stripVTControlCharacters(stdout);
    expect(plainStdout).toContain('Result: PASSED');
    expect(plainStdout).toContain('Passed cases:      1');
  });

  it('runs a failing evaluation and exits with ExitCode.EVALUATION_FAILED (1)', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'cli-failing-eval',
        cases: [
          {
            id: 'c-1',
            input: 'hello',
            expected: 'world',
            assertions: [{ type: 'exact_match' }],
          },
        ],
      }),
    );

    await writeFileAtomic(
      outputsPath,
      JSON.stringify({
        'c-1': 'not-matching',
      }),
    );

    try {
      await execFileAsync('node', [cliEntry, 'run', datasetPath, '-o', outputsPath]);
      expect.fail('Should have exited with code 1');
    } catch (err: unknown) {
      const error = err as { code: number; stdout: string };
      expect(error.code).toBe(ExitCode.EVALUATION_FAILED);
      expect(error.stdout).toContain('Result: FAILED');
    }
  });

  it('rejects malformed dataset with ExitCode.CONFIG_OR_DATASET_ERROR (2)', async () => {
    const datasetPath = path.join(tempDir, 'malformed-dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    // Missing required version and name
    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        invalid: true,
      }),
    );

    await writeFileAtomic(outputsPath, JSON.stringify({}));

    try {
      await execFileAsync('node', [cliEntry, 'run', datasetPath, '-o', outputsPath]);
      expect.fail('Should have exited with code 2');
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(ExitCode.CONFIG_OR_DATASET_ERROR);
      expect(error.stderr).toContain('Dataset validation failed');
    }
  });

  it('supports JSON reporting and file output', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');
    const reportPath = path.join(tempDir, 'report.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'json-output-test',
        cases: [
          {
            id: 'c-1',
            input: 'ping',
            assertions: [{ type: 'required_content', terms: ['pong'] }],
          },
        ],
      }),
    );

    await writeFileAtomic(outputsPath, JSON.stringify({ 'c-1': 'pong response' }));

    await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
      '--reporter',
      'json',
      '--output',
      reportPath,
    ]);

    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const parsed = JSON.parse(reportContent);
    expect(parsed.report.datasetName).toBe('json-output-test');
    expect(parsed.report.status).toBe('PASSED');
  });

  it('supports baseline creation, inspection, and regression comparison', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsV1Path = path.join(tempDir, 'outputs-v1.json');
    const outputsV2Path = path.join(tempDir, 'outputs-v2.json');
    const baselinePath = path.join(tempDir, 'baseline.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'regression-test',
        cases: [
          {
            id: 'c-1',
            input: 'hello',
            expected: 'world',
            assertions: [{ type: 'exact_match' }],
          },
          {
            id: 'c-2',
            input: 'foo',
            expected: 'bar',
            assertions: [{ type: 'exact_match' }],
          },
        ],
      }),
    );

    // V1: Both pass
    await writeFileAtomic(
      outputsV1Path,
      JSON.stringify({
        'c-1': 'world',
        'c-2': 'bar',
      }),
    );

    // Create baseline
    const createRes = await execFileAsync('node', [
      cliEntry,
      'baseline',
      'create',
      datasetPath,
      '-o',
      outputsV1Path,
      '--output',
      baselinePath,
    ]);
    expect(createRes.stdout).toContain('Baseline successfully saved');

    // Inspect baseline
    const inspectRes = await execFileAsync('node', [cliEntry, 'baseline', 'inspect', baselinePath]);
    expect(inspectRes.stdout).toContain('Baseline Inspection');
    expect(inspectRes.stdout).toContain('2 passed');

    // V2: c-1 passes, but c-2 fails (REGRESSION)
    await writeFileAtomic(
      outputsV2Path,
      JSON.stringify({
        'c-1': 'world',
        'c-2': 'regressed-value',
      }),
    );

    try {
      await execFileAsync('node', [
        cliEntry,
        'run',
        datasetPath,
        '-o',
        outputsV2Path,
        '--compare-baseline',
        baselinePath,
      ]);
      expect.fail('Should have exited with code 3 (REGRESSION_DETECTED)');
    } catch (err: unknown) {
      const error = err as { code: number; stdout: string };
      expect(error.code).toBe(ExitCode.REGRESSION_DETECTED);
      expect(error.stdout).toContain('Result: REGRESSION DETECTED');
      expect(error.stdout).toContain('Newly failing:   1 (c-2)');
    }
  });

  it('supports file paths with spaces', async () => {
    const spacedDir = path.join(tempDir, 'path with spaces');
    await fs.mkdir(spacedDir, { recursive: true });

    const datasetPath = path.join(spacedDir, 'my dataset.json');
    const outputsPath = path.join(spacedDir, 'my outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'spaced-path-test',
        cases: [
          {
            id: 'c-space',
            input: 'test',
            assertions: [{ type: 'json' }],
          },
        ],
      }),
    );

    await writeFileAtomic(outputsPath, JSON.stringify({ 'c-space': { ok: true } }));

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
    ]);

    expect(stdout).toContain('Result: PASSED');
  });

  it('exits with code 2 on nonexistent input files and writes error to stderr', async () => {
    const nonexistentDataset = path.join(tempDir, 'does-not-exist.json');
    const outputsPath = path.join(tempDir, 'outputs.json');
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'val' }));

    try {
      await execFileAsync('node', [cliEntry, 'run', nonexistentDataset, '-o', outputsPath]);
      expect.fail('Should have failed with exit code 2');
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(ExitCode.CONFIG_OR_DATASET_ERROR);
      expect(error.stderr).toContain('File not found');
    }
  });

  it('exits with code 2 on malformed JSON input and writes error to stderr', async () => {
    const brokenDataset = path.join(tempDir, 'broken-dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');
    await writeFileAtomic(brokenDataset, '{ invalid json');
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'val' }));

    try {
      await execFileAsync('node', [cliEntry, 'run', brokenDataset, '-o', outputsPath]);
      expect.fail('Should have failed with exit code 2');
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(ExitCode.CONFIG_OR_DATASET_ERROR);
      expect(error.stderr).toContain('Invalid JSON in file');
    }
  });

  it('exits with code 2 on invalid regression policy and writes error to stderr', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');
    const baselinePath = path.join(tempDir, 'baseline.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'pol-test',
        cases: [{ id: 'c1', input: 'hi', assertions: [{ type: 'exact_match', expected: 'hi' }] }],
      }),
    );
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'hi' }));
    await writeFileAtomic(
      baselinePath,
      JSON.stringify({
        baselineVersion: 1,
        createdAt: new Date().toISOString(),
        datasetName: 'pol-test',
        datasetVersion: 1,
        cases: {
          c1: { status: 'PASSED', passedAssertions: 1, failedAssertions: 0, errorAssertions: 0 },
        },
      }),
    );

    try {
      await execFileAsync('node', [
        cliEntry,
        'run',
        datasetPath,
        '-o',
        outputsPath,
        '--compare-baseline',
        baselinePath,
        '--regression-policy',
        'unsupported-policy',
      ]);
      expect.fail('Should have failed with exit code 2');
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(ExitCode.CONFIG_OR_DATASET_ERROR);
      expect(error.stderr).toContain('Invalid regression policy');
    }
  });

  it('runs evaluation with --reporter markdown', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'md-test',
        cases: [{ id: 'c1', input: 'hi', assertions: [{ type: 'exact_match', expected: 'hi' }] }],
      }),
    );
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'hi' }));

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
      '--reporter',
      'markdown',
    ]);

    expect(stdout).toContain('# LLM Eval Report: md-test');
    expect(stdout).toContain('| **Total Cases** | `1` |');
  });

  it('runs evaluation with --reporter junit', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'junit-test',
        cases: [{ id: 'c1', input: 'hi', assertions: [{ type: 'exact_match', expected: 'hi' }] }],
      }),
    );
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'hi' }));

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
      '--reporter',
      'junit',
    ]);

    expect(stdout).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(stdout).toContain('<testsuite name="junit-test"');
  });

  it('filters cases using --tag', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'tag-test',
        cases: [
          {
            id: 'c1',
            input: 'hi',
            tags: ['fast'],
            assertions: [{ type: 'exact_match', expected: 'hi' }],
          },
          {
            id: 'c2',
            input: 'slow',
            tags: ['slow'],
            assertions: [{ type: 'exact_match', expected: 'hi' }],
          },
        ],
      }),
    );
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'hi', c2: 'hi' }));

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
      '--tag',
      'fast',
      '--reporter',
      'json',
    ]);

    const report = JSON.parse(stdout).report;
    expect(report.passedCases).toBe(1);
    expect(report.skippedCases).toBe(1);
  });

  it('updates baseline snapshot with -u / --update-baseline', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    const outputsPath = path.join(tempDir, 'outputs.json');
    const baselinePath = path.join(tempDir, 'new-baseline.json');

    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'snap-test',
        cases: [{ id: 'c1', input: 'hi', assertions: [{ type: 'exact_match', expected: 'hi' }] }],
      }),
    );
    await writeFileAtomic(outputsPath, JSON.stringify({ c1: 'hi' }));

    await execFileAsync('node', [
      cliEntry,
      'run',
      datasetPath,
      '-o',
      outputsPath,
      '-u',
      baselinePath,
    ]);

    const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
    expect(baseline.datasetName).toBe('snap-test');
    expect(baseline.cases.c1.status).toBe('PASSED');
  });

  it('validates a dataset via the dataset validate command', async () => {
    const validDatasetPath = path.join(tempDir, 'valid.json');
    await writeFileAtomic(
      validDatasetPath,
      JSON.stringify({
        version: 1,
        name: 'valid-cli-test',
        cases: [{ id: 'c1', input: 'hi', assertions: [{ type: 'exact_match', expected: 'hi' }] }],
      }),
    );

    const { stdout } = await execFileAsync('node', [
      cliEntry,
      'dataset',
      'validate',
      validDatasetPath,
    ]);
    expect(stdout).toContain('Dataset is valid');

    const invalidDatasetPath = path.join(tempDir, 'invalid.json');
    await writeFileAtomic(invalidDatasetPath, JSON.stringify({ version: 99 }));

    try {
      await execFileAsync('node', [cliEntry, 'dataset', 'validate', invalidDatasetPath]);
      expect.fail('Should have failed with code 2');
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(ExitCode.CONFIG_OR_DATASET_ERROR);
      expect(error.stderr).toContain('Dataset validation failed');
    }
  });
});
