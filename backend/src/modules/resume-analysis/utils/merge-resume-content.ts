/**
 * Keep the candidate's real resume as the source of truth.
 * Only accept a full AI rewrite when it still has name + core sections;
 * otherwise patch role/summary onto the original (cross-field safe).
 */

const SECTION_HEADER =
  /^(professional\s+summary|summary|profile|objective|work\s+experience|experience|employment|skills|technical\s+skills|education|projects|certifications|achievements|awards)\b/i;

function firstContentLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

function looksLikePersonName(line: string): boolean {
  if (!line || line.length < 2 || line.length > 80) return false;
  if (SECTION_HEADER.test(line)) return false;
  if (/@|http|linkedin|github|\+|^\d{2,}/i.test(line)) return false;
  return /[a-zA-Z]/.test(line);
}

function hasExperienceSection(text: string): boolean {
  return /\b(work\s+experience|experience|employment)\b/i.test(text);
}

function hasSkillsOrEducation(text: string): boolean {
  return /\b(skills|education|projects)\b/i.test(text);
}

/** After the name line, set/replace the job-title subtitle with targetRole. */
export function patchRoleSubtitle(resumeText: string, targetRole?: string): string {
  const role = targetRole?.trim();
  if (!role) return resumeText;

  const lines = resumeText.split(/\r?\n/);
  let nameIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 12); i += 1) {
    const line = lines[i]?.trim() ?? '';
    if (!line) continue;
    if (looksLikePersonName(line)) {
      nameIndex = i;
      break;
    }
  }
  if (nameIndex < 0) return resumeText;

  const nextIndex = nameIndex + 1;
  const next = lines[nextIndex]?.trim() ?? '';
  const nextIsContact = /@|http|linkedin|github|\+|^\d{2,}/i.test(next);
  const nextIsSection = SECTION_HEADER.test(next);

  if (!next || nextIsContact || nextIsSection) {
    lines.splice(nextIndex, 0, role);
  } else if (next.length < 90 && !nextIsContact) {
    lines[nextIndex] = role;
  } else {
    lines.splice(nextIndex, 0, role);
  }

  return lines.join('\n');
}

/** Replace PROFESSIONAL SUMMARY / SUMMARY body; keep the rest of the resume intact. */
export function replaceSummarySection(resumeText: string, summary: string): string {
  const cleanSummary = summary.replace(/\s+/g, ' ').trim();
  if (cleanSummary.length < 40) return resumeText;

  const lines = resumeText.split(/\r?\n/);
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? '';
    if (/^(professional\s+summary|summary|profile|objective)\s*:?\s*$/i.test(line)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    let insertAt = Math.min(6, lines.length);
    for (let i = 0; i < Math.min(lines.length, 15); i += 1) {
      if (!lines[i]?.trim()) {
        insertAt = i + 1;
        break;
      }
    }
    lines.splice(insertAt, 0, 'PROFESSIONAL SUMMARY', cleanSummary, '');
    return lines.join('\n');
  }

  let endIndex = lines.length;
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? '';
    if (
      /^(work\s+experience|experience|employment|skills|technical\s+skills|education|projects|certifications|achievements)\b/i.test(
        line,
      )
    ) {
      endIndex = i;
      break;
    }
  }

  const next = [
    ...lines.slice(0, headerIndex + 1),
    cleanSummary,
    '',
    ...lines.slice(endIndex),
  ];
  return next.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function isIncompleteOptimizedResume(
  resumeText: string,
  optimizedText: string,
): boolean {
  const original = resumeText.trim();
  const optimized = optimizedText.trim();
  if (!optimized || optimized.length <= 80) return true;

  const first = firstContentLine(optimized);
  if (!looksLikePersonName(first)) return true;

  const originalComplete =
    original.length > 200 && (hasExperienceSection(original) || hasSkillsOrEducation(original));
  if (!originalComplete) return false;

  if (!hasExperienceSection(optimized) && hasExperienceSection(original)) return true;
  if (optimized.length < Math.min(original.length * 0.55, original.length - 150)) return true;

  return false;
}

export function buildWorkingResumeContent(input: {
  resumeText: string;
  optimizedText: string;
  targetRole?: string;
  improvedSummary?: string;
  /** When true, never replace the whole resume with a truncated AI rewrite. */
  preferOriginalBase?: boolean;
}): string {
  const original = input.resumeText.trim();
  const optimized = input.optimizedText.trim();
  const preferOriginal =
    input.preferOriginalBase === true || isIncompleteOptimizedResume(original, optimized);

  if (!preferOriginal && optimized.length > 80) {
    return patchRoleSubtitle(optimized, input.targetRole);
  }

  if (!original) {
    return optimized ? patchRoleSubtitle(optimized, input.targetRole) : '';
  }

  let content = patchRoleSubtitle(original, input.targetRole);
  const summary = input.improvedSummary?.trim() ?? '';
  if (summary.length > 40) {
    content = replaceSummarySection(content, summary);
  }
  return content;
}
