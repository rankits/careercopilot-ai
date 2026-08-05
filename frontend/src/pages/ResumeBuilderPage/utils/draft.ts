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
  return Boolean(
    draft.originalText.trim() ||
    draft.fullName ||
    draft.summary ||
    draft.skillsList.length ||
    draft.experiences.some((item) => item.company || item.title || item.details) ||
    draft.projectsList.some((item) => item.title || item.company || item.details) ||
    draft.education,
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
    .map((field) => `${field.label}\n${field.value}`.trim())
    .join('\n\n');

  return (
    [
      draft.fullName,
      draft.role,
      contact,
      draft.summary && `SUMMARY\n${draft.summary}`,
      experienceText && `EXPERIENCE\n${experienceText}`,
      draft.education && `EDUCATION\n${draft.education}`,
      draft.skillsList.length > 0 && `SKILLS\n${draft.skillsList.join(', ')}`,
      projectsText && `PROJECTS\n${projectsText}`,
      draft.certifications && `CERTIFICATIONS\n${draft.certifications}`,
      draft.achievements && `ACHIEVEMENTS\n${draft.achievements}`,
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

/**
 * Replace original with suggested inside haystack.
 * Falls back to normalized / line-level matching when exact substring fails.
 */
export function replaceSuggestionText(
  haystack: string,
  originalText: string,
  suggestedText: string,
): { next: string; applied: boolean } {
  const original = originalText.trim();
  const suggested = suggestedText.trim();
  if (!suggested) return { next: haystack, applied: false };

  if (original && haystack.includes(original)) {
    return { next: haystack.replace(original, suggested), applied: true };
  }

  if (!original) {
    const trimmed = haystack.trim();
    return {
      next: trimmed ? `${trimmed}\n${suggested}` : suggested,
      applied: true,
    };
  }

  const normOriginal = normalizeSuggestionMatchText(original);
  if (!normOriginal) {
    return { next: haystack, applied: false };
  }

  // Whole-block normalized equality (common when bullets/spacing differ).
  if (normalizeSuggestionMatchText(haystack) === normOriginal) {
    return { next: suggested, applied: true };
  }

  const lines = haystack.split(/\n/);
  let applied = false;
  const nextLines = lines.map((line) => {
    if (applied) return line;
    const normLine = normalizeSuggestionMatchText(line);
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

  if (applied) return { next: nextLines.join('\n'), applied: true };

  // Soft fallback: append so Apply never silently no-ops for experience/projects.
  const trimmed = haystack.trim();
  return {
    next: trimmed
      ? `${trimmed}\n${suggested.startsWith('-') ? suggested : `- ${suggested}`}`
      : suggested,
    applied: true,
  };
}

function applyToEntryDetails(
  entries: Array<ExperienceEntry | ProjectEntry>,
  original: string,
  suggested: string,
): Array<ExperienceEntry | ProjectEntry> {
  if (entries.length === 0) return entries;

  const normOriginal = original ? normalizeSuggestionMatchText(original) : '';

  // Prefer the entry that actually contains the original excerpt.
  if (normOriginal) {
    const matchIndex = entries.findIndex((entry) => {
      if (!entry.details.trim()) return false;
      return (
        entry.details.includes(original) ||
        normalizeSuggestionMatchText(entry.details).includes(normOriginal)
      );
    });
    if (matchIndex >= 0) {
      return entries.map((entry, index) => {
        if (index !== matchIndex) return entry;
        const result = replaceSuggestionText(entry.details, original, suggested);
        return { ...entry, details: result.next };
      });
    }
  }

  // No matching entry — apply to the first entry with details (or first entry).
  const targetIndex = entries.findIndex((entry) => entry.details.trim()) >= 0
    ? entries.findIndex((entry) => entry.details.trim())
    : 0;

  return entries.map((entry, index) => {
    if (index !== targetIndex) return entry;
    const result = replaceSuggestionText(entry.details || '', original, suggested);
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
    // Only add skill chips — never dump summary/experience prose into Skills.
    const suggestedSkills = splitSkillTokens(suggested);
    const originalSkills = new Set(
      splitSkillTokens(original).map((skill) => skill.toLowerCase()),
    );

    let toAdd = suggestedSkills;
    if (originalSkills.size > 0 && suggestedSkills.length > 1) {
      const delta = suggestedSkills.filter((skill) => !originalSkills.has(skill.toLowerCase()));
      if (delta.length > 0) toAdd = delta;
    }

    // Single-token / short suggestions: trust the suggested text as one skill name.
    if (toAdd.length === 0 && suggested.length > 0 && suggested.length <= 48) {
      const single = suggested.replace(/^add\s+/i, '').replace(/\s+to\s+skills$/i, '').trim();
      if (single && !/\n/.test(single)) toAdd = [single];
    }

    // Guard: long narrative blobs must not become skills.
    if (suggested.length > 120 && toAdd.length > 6) {
      toAdd = toAdd.slice(0, 1);
    }

    const existing = new Set(draft.skillsList.map((skill) => skill.toLowerCase()));
    toAdd = toAdd.filter((skill) => !existing.has(skill.toLowerCase()));
    if (toAdd.length === 0) return draft;

    return {
      ...draft,
      skillsList: mergeSkillLists(draft.skillsList, toAdd),
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
  const replaced = replaceSuggestionText(existing, original, suggested);
  return {
    ...draft,
    [target]: replaced.next,
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
