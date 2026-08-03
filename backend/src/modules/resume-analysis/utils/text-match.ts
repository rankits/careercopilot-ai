export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const uniqSkills = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

/**
 * Case-insensitive term match that handles tech tokens with special chars
 * (C++, .NET, Node.js) where naive \\b boundaries fail.
 */
export const termAppearsIn = (content: string, term: string): boolean => {
  const cleaned = term.trim();
  if (!cleaned || !content) return false;

  const escaped = escapeRegExp(cleaned).replace(/\s+/g, '\\s+');
  const startsWithWord = /^[A-Za-z0-9]/.test(cleaned);
  const endsWithWord = /[A-Za-z0-9]$/.test(cleaned);
  const prefix = startsWithWord ? '\\b' : '(?<![A-Za-z0-9])';
  const suffix = endsWithWord ? '\\b' : '(?![A-Za-z0-9])';

  try {
    return new RegExp(`${prefix}${escaped}${suffix}`, 'i').test(content);
  } catch {
    return content.toLowerCase().includes(cleaned.toLowerCase());
  }
};

export const clampScore = (score: number): number =>
  Math.min(100, Math.max(0, Math.round(score)));
