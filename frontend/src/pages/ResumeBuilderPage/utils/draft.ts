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
    return {
      ...draft,
      skillsList: mergeSkillLists(draft.skillsList, splitSkillTokens(suggested)),
    };
  }

  if (target === 'experience') {
    return {
      ...draft,
      experiences: draft.experiences.map((entry) =>
        original && entry.details.includes(original)
          ? { ...entry, details: entry.details.replace(original, suggested) }
          : entry,
      ),
    };
  }

  if (target === 'projects') {
    return {
      ...draft,
      projectsList: draft.projectsList.map((entry) =>
        original && entry.details.includes(original)
          ? { ...entry, details: entry.details.replace(original, suggested) }
          : entry,
      ),
    };
  }

  const existing = draft[target];
  return {
    ...draft,
    [target]:
      original && existing.includes(original)
        ? existing.replace(original, suggested)
        : suggested || existing,
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
