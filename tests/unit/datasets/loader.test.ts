import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  loadDataset,
  loadOutputs,
  normalizeOutputs,
  OutputFixtureError,
} from '../../../src/datasets/loader.js';
import { writeFileAtomic } from '../../../src/utils/fs.js';

describe('dataset and outputs loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-eval-loader-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads and validates a dataset from file', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    await writeFileAtomic(
      datasetPath,
      JSON.stringify({
        version: 1,
        name: 'file-dataset',
        cases: [
          {
            id: 'case-1',
            input: 'hello',
            expected: 'world',
            assertions: [{ type: 'exact_match' }],
          },
        ],
      }),
    );

    const loaded = await loadDataset(datasetPath);
    expect(loaded.name).toBe('file-dataset');
    expect(loaded.cases[0]?.id).toBe('case-1');
  });

  it('normalizes outputs from direct key-value map', () => {
    const raw = {
      'case-1': 'output-1',
      'case-2': { a: 1 },
    };
    const normalized = normalizeOutputs(raw);
    expect(normalized['case-1']).toBe('output-1');
    expect(normalized['case-2']).toEqual({ a: 1 });
  });

  it('normalizes outputs from versioned wrapper', () => {
    const raw = {
      version: 1,
      outputs: {
        'case-1': 'output-1',
      },
    };
    const normalized = normalizeOutputs(raw);
    expect(normalized['case-1']).toBe('output-1');
  });

  it('normalizes outputs from array of objects with id and output', () => {
    const raw = [
      { id: 'case-1', output: 'result-1' },
      { id: 'case-2', output: 'result-2' },
    ];
    const normalized = normalizeOutputs(raw);
    expect(normalized['case-1']).toBe('result-1');
    expect(normalized['case-2']).toBe('result-2');
  });

  it('throws OutputFixtureError on empty or invalid outputs structure', () => {
    expect(() => normalizeOutputs(null)).toThrow(OutputFixtureError);
    expect(() => normalizeOutputs(123)).toThrow(OutputFixtureError);
    expect(() => normalizeOutputs([{ invalid: true }])).toThrow(OutputFixtureError);
    expect(() => normalizeOutputs({ version: 1, outputs: 'not-an-object' })).toThrow(
      OutputFixtureError,
    );
  });

  it('loads outputs file from disk', async () => {
    const outputsPath = path.join(tempDir, 'outputs.json');
    await writeFileAtomic(
      outputsPath,
      JSON.stringify({
        version: 1,
        outputs: { 'c-1': 'val' },
      }),
    );

    const loaded = await loadOutputs(outputsPath);
    expect(loaded['c-1']).toBe('val');
  });

  it('rejects duplicate case IDs in array format outputs', () => {
    const arrayWithDuplicates = [
      { id: 'c-1', output: 'val1' },
      { id: 'c-1', output: 'val2' },
    ];
    expect(() => normalizeOutputs(arrayWithDuplicates)).toThrow(/duplicate case ID "c-1"/i);
  });

  it('rejects unsupported output fixture versions', () => {
    const unsuppVersion = {
      version: 2,
      outputs: { 'c-1': 'val' },
    };
    expect(() => normalizeOutputs(unsuppVersion)).toThrow(/Unsupported output fixture version: 2/);
  });

  it('preserves explicit null output value distinct from missing fixture', () => {
    const withNull = {
      'case-null': null,
    };
    const normalized = normalizeOutputs(withNull);
    expect(Object.prototype.hasOwnProperty.call(normalized, 'case-null')).toBe(true);
    expect(normalized['case-null']).toBeNull();
  });
});
