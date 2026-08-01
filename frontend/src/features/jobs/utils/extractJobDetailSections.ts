export interface JobDetailSections {
  benefits: string[];
  requirements: string[];
  responsibilities: string[];
  /** descriptionText with extracted headed sections removed (when present). */
  remainingDescription: string;
}

function extractSection(text: string, headings: string[]): string[] {
  if (!text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headingPattern = new RegExp(`^(${headings.join('|')})[:\\s-]*$`, 'i');
  const nextHeading =
    /^(responsibilities|requirements|qualifications|benefits|about|what you)[:\s-]*$/i;

  const startIndex = lines.findIndex((line) => headingPattern.test(line));
  if (startIndex < 0) return [];

  const items: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (nextHeading.test(line) && !headingPattern.test(line)) break;
    const cleaned = line
      .replace(/^[-•*]+\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .trim();
    if (cleaned) items.push(cleaned);
  }
  return items;
}

function stripExtractedSections(text: string): string {
  if (!text.trim()) return text;

  const lines = text.split(/\r?\n/);
  const sectionHeading =
    /^(responsibilities|requirements|qualifications|what you will do|what you'll do|the role|what we look for|you have|benefits)[:\s-]*$/i;

  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (sectionHeading.test(trimmed)) {
      skipping = true;
      continue;
    }
    if (skipping && trimmed.length === 0) {
      skipping = false;
      continue;
    }
    if (skipping) continue;
    kept.push(line);
  }

  return kept.join('\n').trim();
}

/** Pulls bullet sections from plain description text; keeps API benefits as-is. */
export function extractJobDetailSections(
  descriptionText: string | null | undefined,
  benefits: string[] | null | undefined = [],
): JobDetailSections {
  const text = descriptionText?.trim() ?? '';
  const responsibilities = extractSection(text, [
    'responsibilities',
    'what you will do',
    "what you'll do",
    'the role',
  ]);
  const requirements = extractSection(text, [
    'requirements',
    'qualifications',
    'what we look for',
    'you have',
  ]);

  return {
    benefits: (benefits ?? []).filter((item) => item.trim().length > 0),
    requirements,
    responsibilities,
    remainingDescription: stripExtractedSections(text),
  };
}
