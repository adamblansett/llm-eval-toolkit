import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { DEFAULT_MAX_FILE_SIZE_BYTES } from '../config/constants.js';

export interface ReadFileOptions {
  maxSizeBytes?: number;
}

export class FileReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileReadError';
  }
}

export class FileNotFoundError extends FileReadError {
  constructor(filePath: string) {
    super(`File not found: "${filePath}"`);
    this.name = 'FileNotFoundError';
  }
}

export class FileSizeLimitError extends FileReadError {
  constructor(filePath: string, size: number, maxSize: number) {
    super(`File "${filePath}" (${size} bytes) exceeds maximum allowed size of ${maxSize} bytes`);
    this.name = 'FileSizeLimitError';
  }
}

export class InvalidJsonFileError extends FileReadError {
  constructor(filePath: string, causeMessage: string) {
    super(`Invalid JSON in file "${filePath}": ${causeMessage}`);
    this.name = 'InvalidJsonFileError';
  }
}

/**
 * Safely reads a UTF-8 file with size boundary checks.
 */
export async function readFileSafely(filePath: string, options?: ReadFileOptions): Promise<string> {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw new FileReadError(`Failed to access file "${filePath}": ${error.message}`);
  }

  if (!stat.isFile()) {
    if (stat.isDirectory()) {
      throw new FileReadError(`Expected file but found directory: "${filePath}"`);
    }
    throw new FileReadError(`Expected regular file: "${filePath}"`);
  }

  if (stat.size > maxSizeBytes) {
    throw new FileSizeLimitError(filePath, stat.size, maxSizeBytes);
  }

  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Reads and parses a JSON file safely.
 */
export async function readJsonSafely<T = unknown>(
  filePath: string,
  options?: ReadFileOptions,
): Promise<T> {
  const content = await readFileSafely(filePath, options);
  try {
    return JSON.parse(content) as T;
  } catch (err: unknown) {
    const error = err as Error;
    throw new InvalidJsonFileError(filePath, error.message);
  }
}

/**
 * Reads and parses a JSON Lines (.jsonl) file safely.
 */
export async function readJsonlSafely<T = unknown>(
  filePath: string,
  options?: ReadFileOptions,
): Promise<T[]> {
  const content = await readFileSafely(filePath, options);
  const lines = content.split('\n');
  const results: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (line.length === 0) continue;

    try {
      results.push(JSON.parse(line) as T);
    } catch (err: unknown) {
      const error = err as Error;
      throw new InvalidJsonFileError(filePath, `Line ${i + 1} is not valid JSON: ${error.message}`);
    }
  }

  return results;
}

/**
 * Atomically writes a file by writing to a temporary sibling file and renaming.
 * Ensures parent directories are created.
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tempFile = path.join(
    dir,
    `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`,
  );

  try {
    await fs.writeFile(tempFile, content, 'utf-8');
    await fs.rename(tempFile, filePath);
  } catch (err) {
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup error if tempFile was never created or already removed
    }
    throw err;
  }
}
