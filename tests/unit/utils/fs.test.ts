import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  readFileSafely,
  readJsonSafely,
  writeFileAtomic,
  FileReadError,
  FileNotFoundError,
  FileSizeLimitError,
  InvalidJsonFileError,
} from '../../../src/utils/fs.js';

describe('fs utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-eval-test-fs-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('atomically writes and safely reads files', () => {
    const filePath = path.join(tempDir, 'nested', 'test.txt');
    return writeFileAtomic(filePath, 'Hello Atomic World').then(async () => {
      const content = await readFileSafely(filePath);
      expect(content).toBe('Hello Atomic World');
    });
  });

  it('safely reads JSON files', async () => {
    const filePath = path.join(tempDir, 'data.json');
    await writeFileAtomic(filePath, JSON.stringify({ key: 'value', count: 10 }));

    const parsed = await readJsonSafely<{ key: string; count: number }>(filePath);
    expect(parsed).toEqual({ key: 'value', count: 10 });
  });

  it('rejects files exceeding maximum allowed size with FileSizeLimitError', async () => {
    const filePath = path.join(tempDir, 'large.txt');
    await writeFileAtomic(filePath, '1234567890');

    await expect(readFileSafely(filePath, { maxSizeBytes: 5 })).rejects.toThrow(FileSizeLimitError);
    await expect(readFileSafely(filePath, { maxSizeBytes: 5 })).rejects.toThrow(FileReadError);
  });

  it('throws FileNotFoundError for nonexistent files', async () => {
    const nonExistent = path.join(tempDir, 'missing.json');
    await expect(readFileSafely(nonExistent)).rejects.toThrow(FileNotFoundError);
    await expect(readFileSafely(nonExistent)).rejects.toThrow(FileReadError);
  });

  it('rejects directories with FileReadError', async () => {
    const dirPath = path.join(tempDir, 'subfolder');
    await fs.mkdir(dirPath);
    await expect(readFileSafely(dirPath)).rejects.toThrow(FileReadError);
  });

  it('throws InvalidJsonFileError for malformed JSON files', async () => {
    const brokenJson = path.join(tempDir, 'broken.json');
    await writeFileAtomic(brokenJson, '{ not valid json');

    await expect(readJsonSafely(brokenJson)).rejects.toThrow(InvalidJsonFileError);
    await expect(readJsonSafely(brokenJson)).rejects.toThrow(FileReadError);
  });
});
