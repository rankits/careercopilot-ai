import { createEmptyDraft } from './draft';
import { parseExperienceBlocks } from './parseExperience';
import { parseProjectBlocks } from './parseProjects';
import {
  isContactOrMetaLine,
  isNoiseLine,
  matchTopSection,
  sanitizeExtractedText,
} from './sanitize';
import { isSkillLabelNoise, mergeSkillLists, splitSkillTokens } from './skills';
import { newId, type ResumeDraft, type ResumeSectionId } from './types';

function isSkillDumpLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (isSkillLabelNoise(trimmed)) return true;
  if (
    /\b(developed|implemented|participated|wrote|integrated|led|introduced|enhanced|gained|built|created|collaborated|converted|optimized|maintained|provided|fixed|reported)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  const tokens = splitSkillTokens(trimmed);
  const words = trimmed.split(/[\s,|/●•]+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length >= Math.ceil(words.length * 0.5);
}

function cleanExperienceDetails(details: string): string {
  const bullets: string[] = [];
  for (const raw of details.split(/\n/)) {
    const line = raw
      .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) continue;
    if (/^(project\s+details|responsibilities|skills|location:|tech used:)/i.test(line)) continue;
    if (isSkillLabelNoise(line)) continue;
    if (isSkillDumpLine(line)) continue;
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|\d{4})$/i.test(line)) continue;
    bullets.push(line);
  }
  return bullets.join('\n');
}

function normalizeDraft(draft: ResumeDraft): ResumeDraft {
  const summaryLines = draft.summary
    .split(/(?<=\.)\s+|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isContactOrMetaLine(line));

  const summary =
    summaryLines
      .filter(
        (line) => line.length > 40 || /experience|passionate|developer|learning|craft/i.test(line),
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || summaryLines.join(' ').trim();

  return {
    ...draft,
    summary,
    role: draft.role.replace(/develoepr/i, 'Developer').trim(),
    // mergeSkillLists keeps user chips that splitSkillTokens alone might drop.
    skillsList: mergeSkillLists(draft.skillsList, splitSkillTokens(draft.skillsList.join(', '))),
    experiences: draft.experiences.map((entry) => ({
      ...entry,
      title: entry.title.replace(/\s+/g, ' ').trim(),
      company: entry.company.replace(/\s+/g, ' ').trim(),
      details: cleanExperienceDetails(entry.details),
    })),
    projectsList: draft.projectsList.map((entry) => ({
      ...entry,
      details: cleanExperienceDetails(entry.details),
    })),
    education: draft.education.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim(),
  };
}

export function parseResumeContent(content: string, targetRole = ''): ResumeDraft {
  const draft = createEmptyDraft(targetRole);
  const text = sanitizeExtractedText(content?.trim() ?? '');
  if (!text) return draft;
  draft.originalText = text;

  const lines = text.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, ' '));
  const clean = lines.map((line) => line.trim()).filter((line) => line && !isNoiseLine(line));

  if (clean[0] && clean[0].length < 80 && !matchTopSection(clean[0])) {
    draft.fullName = sanitizeExtractedText(clean[0]);
  }
  if (
    clean[1] &&
    clean[1].length < 70 &&
    !matchTopSection(clean[1]) &&
    !/@|http|linkedin|github|\+|^\d/i.test(clean[1])
  ) {
    draft.role = sanitizeExtractedText(clean[1]);
  } else if (targetRole) {
    draft.role = targetRole;
  }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  const linkedinMatch = text.match(/(linkedin\.com\/in\/[^\s/]+\/?)/i);
  const githubMatch = text.match(/(github\.com\/[^\s/]+)/i);
  const portfolioMatch = text.match(/([a-z0-9-]+\.vercel\.app\/?)/i);
  const locationMatch = clean.find(
    (line) =>
      /\b(India|Indore|Mumbai|Bangalore|Delhi|Pune|Hyderabad)\b/i.test(line) &&
      line.length < 40 &&
      !/@|http/i.test(line),
  );

  if (emailMatch) draft.email = emailMatch[0];
  if (phoneMatch) draft.phone = phoneMatch[0].trim();
  if (linkedinMatch) draft.linkedin = linkedinMatch[0];
  if (locationMatch) draft.location = locationMatch;

  let current: ResumeSectionId | 'languages' | 'interests' | null = null;
  const buckets: Partial<Record<ResumeSectionId | 'languages' | 'interests', string[]>> = {};
  const skillExtra: string[] = [];
  let captureSkillsInExperience = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || isNoiseLine(line)) {
      if (current) buckets[current]?.push('');
      continue;
    }

    const section = matchTopSection(line);
    if (section) {
      current = section;
      buckets[current] ??= [];
      captureSkillsInExperience = false;
      continue;
    }

    if (/^skills$/i.test(line) && current === 'experience') {
      captureSkillsInExperience = true;
      continue;
    }

    if (/^responsibilities$/i.test(line) && current === 'experience') {
      captureSkillsInExperience = false;
      buckets.experience ??= [];
      buckets.experience.push('Responsibilities:');
      continue;
    }

    if (!current) continue;

    if (captureSkillsInExperience || current === 'skills') {
      if (!isSkillLabelNoise(line) && !isContactOrMetaLine(line)) skillExtra.push(line);
      if (current === 'skills' && !isSkillLabelNoise(line)) {
        buckets.skills ??= [];
        buckets.skills.push(line);
      }
      continue;
    }

    if (current === 'experience' && isSkillDumpLine(line)) {
      const extracted = splitSkillTokens(line);
      if (extracted.length > 0) skillExtra.push(extracted.join(', '));
      continue;
    }

    buckets[current] ??= [];
    buckets[current]!.push(raw);
  }

  const summaryRaw = (buckets.summary ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isContactOrMetaLine(line));
  const prose = summaryRaw.filter((line) => line.length > 50);
  draft.summary = (prose.length ? prose : summaryRaw).join(' ').replace(/\s+/g, ' ').trim();
  draft.education = (buckets.education ?? []).join('\n').trim();
  draft.certifications = (buckets.certifications ?? []).join('\n').trim();
  draft.achievements = (buckets.achievements ?? []).join('\n').trim();
  draft.skillsList = splitSkillTokens([...(buckets.skills ?? []), ...skillExtra].join('\n'));
  draft.experiences = parseExperienceBlocks((buckets.experience ?? []).join('\n'));
  draft.projectsList = parseProjectBlocks((buckets.projects ?? []).join('\n'));

  const languages = (buckets.languages ?? [])
    .map((line) => line.trim())
    .filter((line) => line && !/full professional proficiency/i.test(line))
    .join(', ');
  const interests = (buckets.interests ?? []).map((line) => line.trim()).filter(Boolean).join(', ');

  if (languages) draft.customFields.push({ id: newId(), label: 'Languages', value: languages });
  if (interests) draft.customFields.push({ id: newId(), label: 'Interests', value: interests });
  if (githubMatch) draft.customFields.push({ id: newId(), label: 'GitHub', value: githubMatch[0] });
  if (portfolioMatch) {
    draft.customFields.push({ id: newId(), label: 'Portfolio', value: portfolioMatch[0] });
  }

  return normalizeDraft(draft);
}
