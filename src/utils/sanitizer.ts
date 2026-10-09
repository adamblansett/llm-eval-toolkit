import { MAX_PREVIEW_LENGTH } from '../config/constants.js';

/**
 * Produces a safe, compact string representation of an arbitrary value,
 * truncating long outputs to avoid dumping massive or sensitive payloads into logs.
 */
export function safePreview(value: unknown, maxLength = MAX_PREVIEW_LENGTH): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }

  let text: string;
  if (typeof value === 'string') {
    text = JSON.stringify(value);
  } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    text = String(value);
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }

  if (text.length <= maxLength) {
    return text;
  }

  const half = Math.floor((maxLength - 5) / 2);
  return `${text.slice(0, half)} ... ${text.slice(-half)}`;
}
