import path from 'node:path';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

/**
 * Normalizes and resolves a file path safely against a base directory (defaulting to process.cwd()).
 * Throws if the path attempts traversal outside a specified root when a root boundary is enforced.
 */
export function resolveSafePath(filePath: string, basePath = process.cwd()): string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new PathSecurityError('Path must be a non-empty string');
  }

  if (filePath.includes('\0')) {
    throw new PathSecurityError('Path must not contain null bytes');
  }

  const resolved = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(basePath, filePath);

  return resolved;
}

/**
 * Validates that a path is contained within a designated root directory.
 */
export function assertPathWithinRoot(filePath: string, rootDir: string): string {
  const resolvedTarget = resolveSafePath(filePath, rootDir);
  const resolvedRoot = path.resolve(rootDir);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new PathSecurityError(
      `Path traversal denied: "${filePath}" is outside root directory "${rootDir}"`,
    );
  }

  return resolvedTarget;
}
