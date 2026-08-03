/** Shared helpers for AI provider JSON responses. */

export const extractTextContent = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return typeof (part as { text?: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '';
        }
        return '';
      })
      .join('')
      .trim();
  }

  if (value && typeof value === 'object' && 'content' in value) {
    return extractTextContent((value as { content?: unknown }).content);
  }

  return '';
};

export const stripJsonFences = (rawText: string): string =>
  rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

export const parseProviderJson = (rawText: string, providerLabel: string): unknown => {
  const jsonText = stripJsonFences(rawText);
  if (!jsonText) {
    throw new Error(`${providerLabel} returned an empty response`);
  }

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error(`${providerLabel} did not return valid JSON for the resume parser`);
  }
};
