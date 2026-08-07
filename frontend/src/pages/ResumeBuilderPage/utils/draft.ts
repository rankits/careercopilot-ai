import { mergeSkillLists, splitSkillTokens } from './skills';
import {
  newId,
  type CustomField,
  type ExperienceEntry,
  type ProjectEntry,
  type ResumeDraft,
  type ResumeSectionId,
} from './types';

export function createEmptyExperience(): ExperienceEntry {
  return { id: newId(), company: '', title: '', startDate: '', endDate: '', details: '' };
}

export function createEmptyProject(): ProjectEntry {
  return { id: newId(), title: '', company: '', startDate: '', endDate: '', details: '' };
}

export function createEmptyCustomField(): CustomField {
  return { id: newId(), label: '', value: '' };
}

export function createEmptyDraft(targetRole = ''): ResumeDraft {
  return {
    originalText: '',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    role: targetRole,
    summary: '',
    education: '',
    certifications: '',
    achievements: '',
    skillsList: [],
    experiences: [],
    projectsList: [],
    customFields: [],
  };
}

export function hasPreviewContent(draft: ResumeDraft): boolean {
  // Require structured fields — originalText alone must not show a hollow "Your Name" sheet.
  return Boolean(
    draft.fullName ||
    draft.summary ||
    draft.skillsList.length ||
    draft.experiences.some((item) => item.company || item.title || item.details) ||
    draft.projectsList.some((item) => item.title || item.company || item.details) ||
    draft.education ||
    draft.certifications ||
    draft.achievements,
  );
}

function serializeExperience(entry: ExperienceEntry): string {
  const heading = [entry.title, entry.company].filter(Boolean).join(' | ');
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' – ');
  const bullets = entry.details
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('-') ? line : `- ${line}`))
    .join('\n');
  return [heading, dates, bullets].filter(Boolean).join('\n');
}

function serializeProject(entry: ProjectEntry): string {
  const heading = [entry.title, entry.company].filter(Boolean).join(' | ');
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' – ');
  const bullets = entry.details
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('-') ? line : `- ${line}`))
    .join('\n');
  return [heading, dates, bullets].filter(Boolean).join('\n');
}

export function serializeResumeDraft(draft: ResumeDraft): string {
  const contact = [draft.email, draft.phone, draft.location, draft.linkedin]
    .filter(Boolean)
    .join(' | ');

  const experienceText = draft.experiences
    .filter((entry) => entry.company || entry.title || entry.details)
    .map(serializeExperience)
    .join('\n\n');

  const projectsText = draft.projectsList
    .filter((entry) => entry.title || entry.company || entry.details)
    .map(serializeProject)
    .join('\n\n');

  const customText = draft.customFields
    .filter((field) => field.label || field.value)
    .map((field) => {
      const label = field.label.trim() || 'Additional';
      const value = field.value.trim();
      // One-line Label: value so ADDITIONAL round-trips without Interests swallowing links.
      return value ? `${label}: ${value}` : label;
    })
    .join('\n');

  // Clear section headers so parse + preview keep content under the right block.
  return (
    [
      draft.fullName,
      draft.role,
      contact,
      draft.summary && `PROFESSIONAL SUMMARY\n${draft.summary.trim()}`,
      experienceText && `WORK EXPERIENCE\n${experienceText}`,
      draft.education && `EDUCATION\n${draft.education.trim()}`,
      draft.skillsList.length > 0 && `SKILLS\n${draft.skillsList.join(', ')}`,
      projectsText && `PROJECTS\n${projectsText}`,
      draft.certifications && `CERTIFICATIONS\n${draft.certifications.trim()}`,
      draft.achievements && `ACHIEVEMENTS\n${draft.achievements.trim()}`,
      customText && `ADDITIONAL\n${customText}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim() || draft.originalText
  );
}

export function getSectionText(draft: ResumeDraft, section: ResumeSectionId): string {
  switch (section) {
    case 'skills':
      return draft.skillsList.join(', ');
    case 'experience':
      return draft.experiences.map(serializeExperience).join('\n\n');
    case 'projects':
      return draft.projectsList.map(serializeProject).join('\n\n');
    default:
      return draft[section];
  }
}

/** Normalize text so OCR/bullet/whitespace drift does not block suggestion apply. */
export function normalizeSuggestionMatchText(value: string): string {
  return value
    .replace(/^[\s|*]*[-*•●·▪▸►○◦]+[\s·.•]*/gm, '')
    .replace(/[|│┃]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function suggestionTokens(value: string): string[] {
  return normalizeSuggestionMatchText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/** Jaccard-ish overlap so fuzzy line replace works when OCR drifts. */
export function suggestionOverlapRatio(a: string, b: string): number {
  const left = new Set(suggestionTokens(a));
  const right = new Set(suggestionTokens(b));
  if (left.size === 0 || right.size === 0) return 0;
  let hits = 0;
  for (const token of left) {
    if (right.has(token)) hits += 1;
  }
  return hits / Math.max(left.size, right.size);
}

function stripBulletPrefix(value: string): string {
  return value.replace(/^[\s|*]*[-*•●·▪▸►○◦]+\s*/, '').trim();
}

function withBulletPrefix(oldLine: string, next: string): string {
  const body = stripBulletPrefix(next);
  if (!body) return oldLine;
  if (/^[\s|*]*[-*•●·▪▸►○◦]/.test(oldLine) || /^[\s|*]*[-*•]/.test(next)) {
    return `- ${body}`;
  }
  return body;
}

function formatBulletLines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const body = stripBulletPrefix(line);
      return body ? `- ${body}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Replace original with suggested inside haystack.
 * Prefers in-place replace over append so Apply never duplicates content.
 */
export function replaceSuggestionText(
  haystack: string,
  originalText: string,
  suggestedText: string,
  options?: { style?: 'prose' | 'bullets' },
): { next: string; applied: boolean } {
  const style = options?.style ?? 'prose';
  const original = originalText.trim();
  const suggested = suggestedText.trim();
  if (!suggested) return { next: haystack, applied: false };

  const suggestedNorm = normalizeSuggestionMatchText(suggested);
  const haystackNorm = normalizeSuggestionMatchText(haystack);

  // Already applied — only skip when the full suggestion is already the section body.
  // Substring matches used to false-positive and make Apply look like a live-preview no-op.
  if (
    suggestedNorm &&
    suggestedNorm.length >= 12 &&
    (haystackNorm === suggestedNorm ||
      (haystackNorm.includes(suggestedNorm) &&
        suggestedNorm.length >= Math.max(24, haystackNorm.length * 0.8)))
  ) {
    return { next: haystack, applied: true };
  }

  if (original && haystack.includes(original)) {
    const next = haystack.replace(original, suggested);
    return {
      next: style === 'bullets' ? formatBulletLines(next) : next,
      applied: true,
    };
  }

  const normOriginal = original ? normalizeSuggestionMatchText(original) : '';

  // Whole-block normalized equality (common when bullets/spacing differ).
  if (normOriginal && haystackNorm === normOriginal) {
    return {
      next: style === 'bullets' ? formatBulletLines(suggested) : suggested,
      applied: true,
    };
  }

  // Empty original: rewrite existing content instead of appending duplicates.
  if (!original) {
    const trimmed = haystack.trim();
    if (!trimmed) {
      return {
        next: style === 'bullets' ? formatBulletLines(suggested) : suggested,
        applied: true,
      };
    }
    if (style === 'prose') {
      return { next: suggested, applied: true };
    }
    const lines = trimmed.split(/\n/).filter((line) => line.trim());
    if (lines.length <= 1) {
      return { next: formatBulletLines(suggested), applied: true };
    }
    // Multi-bullet block with no original: replace the first bullet only.
    const nextLines = [...lines];
    nextLines[0] = withBulletPrefix(lines[0]!, suggested);
    return { next: formatBulletLines(nextLines.join('\n')), applied: true };
  }

  const lines = haystack.split(/\n/);

  // Exact / contains line match.
  let applied = false;
  let nextLines = lines.map((line) => {
    if (applied) return line;
    const normLine = normalizeSuggestionMatchText(line);
    if (!normLine) return line;
    if (
      normLine === normOriginal ||
      (normOriginal.length >= 12 && normLine.includes(normOriginal)) ||
      (normLine.length >= 12 && normOriginal.includes(normLine))
    ) {
      applied = true;
      return withBulletPrefix(line, suggested);
    }
    return line;
  });
  if (applied) {
    return {
      next: style === 'bullets' ? formatBulletLines(nextLines.join('\n')) : nextLines.join('\n'),
      applied: true,
    };
  }

  // Fuzzy: replace the line that best overlaps the original (or suggested rewrite).
  let bestIdx = -1;
  let bestScore = 0;
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const score = Math.max(
      suggestionOverlapRatio(line, original),
      suggestionOverlapRatio(line, suggested) * 0.85,
    );
    if (score > bestScore) {
      bestScore = score;
      bestIdx = index;
    }
  });

  if (bestIdx >= 0 && bestScore >= 0.4) {
    nextLines = [...lines];
    nextLines[bestIdx] = withBulletPrefix(lines[bestIdx]!, suggested);
    return {
      next: style === 'bullets' ? formatBulletLines(nextLines.join('\n')) : nextLines.join('\n'),
      applied: true,
    };
  }

  // Multi-line original: replace contiguous window with best overlap.
  const originalLineCount = Math.max(1, original.split(/\n/).filter((line) => line.trim()).length);
  if (originalLineCount > 1 && lines.length >= originalLineCount) {
    let windowBest = -1;
    let windowScore = 0;
    for (let start = 0; start <= lines.length - originalLineCount; start += 1) {
      const block = lines.slice(start, start + originalLineCount).join('\n');
      const score = suggestionOverlapRatio(block, original);
      if (score > windowScore) {
        windowScore = score;
        windowBest = start;
      }
    }
    if (windowBest >= 0 && windowScore >= 0.4) {
      const before = lines.slice(0, windowBest);
      const after = lines.slice(windowBest + originalLineCount);
      const replacement = suggested.split(/\n/).filter((line) => line.trim());
      const merged = [...before, ...replacement, ...after].join('\n');
      return {
        next: style === 'bullets' ? formatBulletLines(merged) : merged,
        applied: true,
      };
    }
  }

  // Last resort for bullets: append only when clearly new and not overlapping.
  if (style === 'bullets' && bestScore < 0.25) {
    const trimmed = haystack.trim();
    const bullet = suggested.startsWith('-') ? suggested : `- ${stripBulletPrefix(suggested)}`;
    return {
      next: formatBulletLines(trimmed ? `${trimmed}\n${bullet}` : bullet),
      applied: true,
    };
  }

  // Prose last resort: replace whole section rather than concatenating duplicates.
  return {
    next: suggested,
    applied: true,
  };
}

function applyToEntryDetails(
  entries: Array<ExperienceEntry | ProjectEntry>,
  original: string,
  suggested: string,
): Array<ExperienceEntry | ProjectEntry> {
  const bulletBody = stripBulletPrefix(suggested);
  const bullet = bulletBody ? `- ${bulletBody}` : suggested;

  // HIGH IMPACT apply must never no-op when the section is still empty.
  if (entries.length === 0) {
    return [
      {
        id: newId(),
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        details: formatBulletLines(bullet),
      },
    ];
  }

  const normOriginal = original ? normalizeSuggestionMatchText(original) : '';
  const looksLikeTitle =
    Boolean(suggested) &&
    !/\n/.test(suggested) &&
    suggested.length <= 90 &&
    !/[.!?]$/.test(suggested.trim());

  // Title / company rename (common project & role suggestions).
  if (normOriginal) {
    const titleIndex = entries.findIndex((entry) => {
      const titleNorm = normalizeSuggestionMatchText(entry.title);
      const companyNorm = normalizeSuggestionMatchText(entry.company);
      return (
        (titleNorm &&
          (titleNorm === normOriginal ||
            titleNorm.includes(normOriginal) ||
            normOriginal.includes(titleNorm))) ||
        (companyNorm &&
          (companyNorm === normOriginal ||
            companyNorm.includes(normOriginal) ||
            normOriginal.includes(companyNorm)))
      );
    });
    if (titleIndex >= 0 && looksLikeTitle) {
      return entries.map((entry, index) => {
        if (index !== titleIndex) return entry;
        const titleNorm = normalizeSuggestionMatchText(entry.title);
        const replaceTitle =
          titleNorm &&
          (titleNorm === normOriginal ||
            titleNorm.includes(normOriginal) ||
            normOriginal.includes(titleNorm));
        return replaceTitle
          ? { ...entry, title: suggested.trim() }
          : { ...entry, company: suggested.trim() };
      });
    }
  }

  // Prefer the entry that actually contains the original excerpt.
  if (normOriginal) {
    const matchIndex = entries.findIndex((entry) => {
      if (!entry.details.trim()) return false;
      return (
        entry.details.includes(original) ||
        normalizeSuggestionMatchText(entry.details).includes(normOriginal) ||
        suggestionOverlapRatio(entry.details, original) >= 0.4
      );
    });
    if (matchIndex >= 0) {
      return entries.map((entry, index) => {
        if (index !== matchIndex) return entry;
        const result = replaceSuggestionText(entry.details, original, suggested, {
          style: 'bullets',
        });
        return { ...entry, details: result.next };
      });
    }
  }

  // No matching entry — apply to the first entry with details (or first entry).
  const targetIndex =
    entries.findIndex((entry) => entry.details.trim()) >= 0
      ? entries.findIndex((entry) => entry.details.trim())
      : 0;

  return entries.map((entry, index) => {
    if (index !== targetIndex) return entry;
    // Short title-like suggestion with empty original: update the title when empty/weak.
    if (!normOriginal && looksLikeTitle && (!entry.title.trim() || entry.title.length < 8)) {
      return { ...entry, title: suggested.trim() };
    }
    const result = replaceSuggestionText(entry.details || '', original, suggested, {
      style: 'bullets',
    });
    return { ...entry, details: result.next };
  });
}

export function applyTextReplaceToDraft(
  draft: ResumeDraft,
  section: ResumeSectionId | 'other',
  originalText: string,
  suggestedText: string,
): ResumeDraft {
  const target = section === 'other' ? 'summary' : section;
  const original = originalText.trim();
  const suggested = suggestedText.trim();
  if (!suggested) return draft;

  if (target === 'skills') {
    // Only skill chips — never dump summary/experience prose into Skills.
    const suggestedSkills = splitSkillTokens(suggested);
    const originalSkills = splitSkillTokens(original);
    const originalSet = new Set(originalSkills.map((skill) => skill.toLowerCase()));

    let toAdd = suggestedSkills;
    if (toAdd.length === 0 && suggested.length > 0 && suggested.length <= 48) {
      const single = suggested
        .replace(/^add\s+/i, '')
        .replace(/\s+to\s+skills$/i, '')
        .trim();
      if (single && !/\n/.test(single)) toAdd = [single];
    }
    // Guard: long narrative blobs must not become skills.
    if (suggested.length > 120 && toAdd.length > 6) {
      toAdd = toAdd.slice(0, 1);
    }
    if (toAdd.length === 0) return draft;

    const coversMostDraft =
      draft.skillsList.length > 0 &&
      draft.skillsList.filter((skill) => originalSet.has(skill.toLowerCase())).length >=
        Math.ceil(draft.skillsList.length * 0.6);

    // Full rewrite only when original looks like the current skills section.
    const isRewrite = toAdd.length >= 3 && originalSkills.length >= 3 && coversMostDraft;

    if (isRewrite) {
      const keep = draft.skillsList.filter((skill) => !originalSet.has(skill.toLowerCase()));
      return {
        ...draft,
        skillsList: mergeSkillLists(keep, toAdd),
      };
    }

    // Default: add missing skills only (never duplicate on re-Apply).
    const existing = new Set(draft.skillsList.map((skill) => skill.toLowerCase()));
    const missing = toAdd.filter((skill) => !existing.has(skill.toLowerCase()));
    if (missing.length === 0) return draft;
    return {
      ...draft,
      skillsList: mergeSkillLists(draft.skillsList, missing),
    };
  }

  if (target === 'experience') {
    return {
      ...draft,
      experiences: applyToEntryDetails(draft.experiences, original, suggested),
    };
  }

  if (target === 'projects') {
    return {
      ...draft,
      projectsList: applyToEntryDetails(draft.projectsList, original, suggested),
    };
  }

  const existing = draft[target];
  const replaced = replaceSuggestionText(existing, original, suggested, { style: 'prose' });
  const nextText = replaced.next;
  // If fuzzy match left the section unchanged but AI suggested a distinct rewrite, force it.
  if (
    normalizeSuggestionMatchText(nextText) === normalizeSuggestionMatchText(existing) &&
    normalizeSuggestionMatchText(suggested) !== normalizeSuggestionMatchText(existing)
  ) {
    return {
      ...draft,
      [target]: suggested,
    };
  }
  return {
    ...draft,
    [target]: nextText,
  };
}

export function normalizeSuggestionCategory(category: string): ResumeSectionId | 'other' {
  const value = category.trim().toLowerCase();
  if (value.includes('summary') || value.includes('profile')) return 'summary';
  if (value.includes('experience') || value.includes('work')) return 'experience';
  if (value.includes('skill')) return 'skills';
  if (value.includes('education')) return 'education';
  if (value.includes('project')) return 'projects';
  if (value.includes('certif')) return 'certifications';
  if (value.includes('achieve') || value.includes('award')) return 'achievements';
  return 'other';
}
