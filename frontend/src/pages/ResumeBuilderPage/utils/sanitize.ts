import { SECTION_ALIASES, type ResumeSectionId } from './types';

export function isNoiseLine(line: string) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) || /^page\s+\d+/i.test(line);
}

export function matchTopSection(line: string): ResumeSectionId | 'languages' | 'interests' | null {
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
  if (/^languages?$/i.test(normalized)) return 'languages';
  if (/^interests?$|^hobbies$/i.test(normalized)) return 'interests';
  return null;
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
