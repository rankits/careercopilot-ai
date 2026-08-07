import { SECTION_ALIASES, type ResumeSectionId } from './types';

export function isNoiseLine(line: string) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) || /^page\s+\d+/i.test(line);
}

export type CustomFieldLabel = 'languages' | 'interests' | 'github' | 'portfolio' | 'additional';

export function matchCustomFieldLabel(line: string): CustomFieldLabel | null {
  const normalized = line
    .replace(/^[#*_>\s]+/, '')
    .replace(/[:\-–—|•●]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length > 40) return null;
  if (normalized.split(/\s+/).length > 4) return null;
  if (/^additional(\s+information)?$|^other(\s+details)?$/i.test(normalized)) return 'additional';
  if (/^languages?$/i.test(normalized)) return 'languages';
  if (/^interests?$|^hobbies$/i.test(normalized)) return 'interests';
  if (/^github$|^git\s*hub$/i.test(normalized)) return 'github';
  if (/^portfolio$|^website$|^personal\s+site$/i.test(normalized)) return 'portfolio';
  return null;
}

export function matchTopSection(line: string): ResumeSectionId | CustomFieldLabel | null {
  const normalized = line
    .replace(/^[#*_>\s]+/, '')
    .replace(/[:\-–—|•●]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length > 64) return null;
  // Reject lines that look like sentences (too many words / lowercase verbs).
  if (normalized.split(/\s+/).length > 8) return null;
  for (const [id, pattern] of Object.entries(SECTION_ALIASES) as Array<[ResumeSectionId, RegExp]>) {
    if (pattern.test(normalized)) return id;
  }
  return matchCustomFieldLabel(normalized);
}

export function sanitizeExtractedText(input: string): string {
  return input
    .replace(/\u00a0/g, ' ')
    .replace(/Ÿ/g, 'ti')
    .replace(/ÿ/g, 'ti')
    .replace(/Θ|θ/g, 'ti')
    .replace(/Σ|σ/g, 'tt')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/©/g, 'tt')
    .replace(/®/g, 'r')
    .replace(/SoLware/gi, 'Software')
    .replace(/Engi(?=\s|$)/gi, 'Engineer')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanBulletText(line: string): string {
  return line
    .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
    .replace(/^[\s·.•]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isContactOrMetaLine(line: string): boolean {
  return (
    /@/.test(line) ||
    /linkedin\.com|github\.com|vercel\.app|http/i.test(line) ||
    /^\+?\d[\d\s().-]{8,}\d$/.test(line) ||
    /^(senior|junior|lead|intern)?\s*(frontend|backend|full[\s-]?stack|react|angular|software)\s+(developer|engineer)/i.test(
      line,
    ) ||
    (/india|indore|mumbai|bangalore|delhi|pune|hyderabad/i.test(line) && line.length < 40)
  );
}

/** Lines that belong to link/meta custom fields — never Interests body. */
export function isLinkOrMetaCustomValue(line: string): boolean {
  return (
    isContactOrMetaLine(line) ||
    /^(github|portfolio|website|linkedin|twitter|x\.com)\b/i.test(line.trim()) ||
    /\.(com|app|dev|io|net|org)\b/i.test(line)
  );
}
