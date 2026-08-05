export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const clampScore = (score: number): number => Math.min(100, Math.max(0, Math.round(score)));

/** Normalize OCR/bullet/whitespace drift for suggestion grounding + apply. */
export const normalizeMatchText = (value: string): string =>
  value
    .replace(/^[\s|*]*[-*•●·▪▸►○◦]+[\s·.•]*/gm, '')
    .replace(/[|│┃]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Replace originalText with suggestedText, tolerating bullet/whitespace drift.
 * Returns null when no safe match is found.
 */
export const replaceTextFuzzy = (
  haystack: string,
  originalText: string,
  suggestedText: string,
): string | null => {
  const original = originalText.trim();
  const suggested = suggestedText.trim();
  if (!suggested) return null;

  if (original && haystack.includes(original)) {
    return haystack.replace(original, suggested);
  }

  if (!original) return null;

  const normOriginal = normalizeMatchText(original);
  if (!normOriginal) return null;

  if (normalizeMatchText(haystack) === normOriginal) {
    return suggested;
  }

  const lines = haystack.split(/\n/);
  let applied = false;
  const nextLines = lines.map((line) => {
    if (applied) return line;
    const normLine = normalizeMatchText(line);
    if (!normLine) return line;
    if (
      normLine === normOriginal ||
      (normOriginal.length >= 12 && normLine.includes(normOriginal)) ||
      (normLine.length >= 12 && normOriginal.includes(normLine))
    ) {
      applied = true;
      return suggested;
    }
    return line;
  });

  return applied ? nextLines.join('\n') : null;
};

/** True when originalText appears in resume (exact or normalized). */
export const textAppearsFuzzy = (content: string, originalText: string): boolean => {
  const original = originalText.trim();
  if (!original || !content) return false;
  if (content.includes(original)) return true;
  const normOriginal = normalizeMatchText(original);
  if (!normOriginal) return false;
  if (normalizeMatchText(content).includes(normOriginal)) return true;
  return content.split(/\n/).some((line) => {
    const normLine = normalizeMatchText(line);
    return (
      normLine === normOriginal ||
      (normOriginal.length >= 12 && normLine.includes(normOriginal)) ||
      (normLine.length >= 12 && normOriginal.includes(normLine))
    );
  });
};
