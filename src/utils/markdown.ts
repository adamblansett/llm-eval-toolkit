/**
 * Extracts and cleans JSON content from markdown code fences if present.
 * e.g., ```json\n{ "key": "value" }\n``` -> { "key": "value" }
 */
export function stripCodeFences(text: string): string {
  if (typeof text !== 'string') {
    return text;
  }

  const trimmed = text.trim();

  // Match ```[lang]\n...\n```
  const fenceRegex = /^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```$/;
  const match = fenceRegex.exec(trimmed);
  if (match && match[1] !== undefined) {
    return match[1].trim();
  }

  // Also handle inline code backticks `...` if wrapped completely
  if (trimmed.startsWith('`') && trimmed.endsWith('`') && !trimmed.slice(1, -1).includes('`')) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}
