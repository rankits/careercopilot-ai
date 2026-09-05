import { createEmptyDraft } from './draft';
import { parseExperienceBlocks } from './parseExperience';
import { parseProjectBlocks, resolveProjectDisplayTitle } from './parseProjects';
import {
  isContactOrMetaLine,
  isLinkOrMetaCustomValue,
  isNoiseLine,
  matchCustomFieldLabel,
  matchTopSection,
  sanitizeExtractedText,
  type CustomFieldLabel,
} from './sanitize';
import { isSkillLabelNoise, mergeSkillLists, splitSkillTokens } from './skills';
import { newId, type ResumeDraft, type ResumeSectionId } from './types';

type ParseBucket = ResumeSectionId | CustomFieldLabel;

const CUSTOM_LABEL_TITLE: Record<Exclude<CustomFieldLabel, 'additional'>, string> = {
  languages: 'Languages',
  interests: 'Interests',
  github: 'GitHub',
  portfolio: 'Portfolio',
};

const JOB_DATE_LINE =
  /^((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[/.-]\d{4}|\d{4})\s*[-–—−to]+\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[/.-]\d{4}|\d{4}|present|current|now)/i;

const DEGREE_LINE =
  /\b(b\.?\s?tech|b\.?\s?e\.?|m\.?\s?tech|m\.?\s?s\.?|mba|bsc|msc|bachelor|master|phd|diploma|high\s+school|intermediate)\b/i;

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

    const prev = bullets[bullets.length - 1];
    const hadBullet = /^[\s|]*[-*•●·▪▸►]/.test(raw);
    if (
      prev &&
      !hadBullet &&
      (/^[a-z]/.test(line) || /[,;:/-]$/.test(prev) || (!/[.!?]$/.test(prev) && prev.length > 30))
    ) {
      bullets[bullets.length - 1] = `${prev} ${line}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    bullets.push(line);
  }
  return bullets.join('\n');
}

function looksLikePersonName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60 || trimmed.length < 3) return false;
  if (matchTopSection(trimmed) || isContactOrMetaLine(trimmed)) return false;
  if (/@|https?:\/\//i.test(trimmed)) return false;
  if (/\d{3,}/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
  if (words.every((word) => /^[A-Z]/.test(word) || /^[A-Z][a-z'-]+$/.test(word))) return true;
  return /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,4}$/.test(trimmed);
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
        (line) =>
          line.length > 40 ||
          /experience|passionate|developer|engineer|learning|craft|professional/i.test(line),
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
    experiences: draft.experiences
      .map((entry) => ({
        ...entry,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        company: entry.company.replace(/\s+/g, ' ').trim(),
        details: cleanExperienceDetails(entry.details),
      }))
      .filter((entry) => entry.company || entry.title || entry.details),
    projectsList: draft.projectsList
      .map((entry) => ({
        ...entry,
        title: resolveProjectDisplayTitle(entry),
        company: entry.company.replace(/\s+/g, ' ').trim(),
        details: cleanExperienceDetails(entry.details),
      }))
      .filter((entry) => entry.title || entry.company || entry.details),
    education: draft.education.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim(),
  };
}

function isSparseDraft(draft: ResumeDraft): boolean {
  const hasExperience = draft.experiences.some(
    (entry) => entry.company || entry.title || entry.details,
  );
  const hasProjects = draft.projectsList.some(
    (entry) => entry.title || entry.company || entry.details,
  );
  return (
    !draft.summary &&
    draft.skillsList.length === 0 &&
    !hasExperience &&
    !hasProjects &&
    !draft.education
  );
}

/**
 * When section headers are missing/odd (common in PDF OCR), recover content
 * into the app's structured default draft so Live Preview never goes hollow.
 */
function recoverUnstructuredContent(draft: ResumeDraft, text: string): ResumeDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter((line) => line && !isNoiseLine(line));

  const next: ResumeDraft = { ...draft };

  if (!next.fullName) {
    const nameLine = lines.slice(0, 10).find((line) => looksLikePersonName(line));
    if (nameLine) next.fullName = sanitizeExtractedText(nameLine);
  }

  if (next.skillsList.length === 0) {
    next.skillsList = splitSkillTokens(text);
  }

  if (!next.education) {
    const eduLines = lines.filter((line) => DEGREE_LINE.test(line));
    if (eduLines.length > 0) next.education = eduLines.slice(0, 4).join('\n');
  }

  if (!next.experiences.some((entry) => entry.company || entry.title || entry.details)) {
    // Prefer date-anchored blocks; otherwise keep meaningful bullets as one role.
    const dateIndexes = lines
      .map((line, index) => (JOB_DATE_LINE.test(line) ? index : -1))
      .filter((index) => index >= 0);

    if (dateIndexes.length > 0) {
      const recovered: ResumeDraft['experiences'] = [];
      for (let i = 0; i < dateIndexes.length; i += 1) {
        const dateIndex = dateIndexes[i]!;
        const nextDate = dateIndexes[i + 1] ?? lines.length;
        const dateLine = lines[dateIndex] ?? '';
        const heading = lines[dateIndex - 1] ?? '';
        const details = lines
          .slice(dateIndex + 1, nextDate)
          .filter(
            (line) =>
              !JOB_DATE_LINE.test(line) &&
              !matchTopSection(line) &&
              !isContactOrMetaLine(line) &&
              line !== next.fullName,
          )
          .join('\n');
        const pipe = heading.match(/^(.+?)\s*\|\s*(.+)$/);
        const dash = heading.match(/^(.+?)\s[-–—−]\s+(.+)$/);
        recovered.push({
          id: newId(),
          title: pipe?.[1]?.trim() || dash?.[2]?.trim() || heading || 'Role',
          company: pipe?.[2]?.trim() || dash?.[1]?.trim() || '',
          startDate: dateLine.split(/\s*[-–—−]|to\s+/i)[0]?.trim() ?? '',
          endDate: dateLine.split(/\s*[-–—−]|to\s+/i)[1]?.trim() ?? '',
          details,
        });
      }
      next.experiences = recovered;
    } else {
      const body = lines
        .filter(
          (line) =>
            line !== next.fullName &&
            !isContactOrMetaLine(line) &&
            !matchTopSection(line) &&
            !DEGREE_LINE.test(line) &&
            line.length > 25,
        )
        .slice(0, 12)
        .join('\n');
      if (body) {
        next.experiences = [
          {
            id: newId(),
            title: next.role || 'Professional Experience',
            company: '',
            startDate: '',
            endDate: '',
            details: body,
          },
        ];
      }
    }
  }

  if (!next.summary) {
    const prose = lines.find(
      (line) =>
        line.length > 60 &&
        !isContactOrMetaLine(line) &&
        !JOB_DATE_LINE.test(line) &&
        !DEGREE_LINE.test(line) &&
        !matchTopSection(line) &&
        line !== next.fullName,
    );
    if (prose) next.summary = prose;
  }

  if (!next.projectsList.some((entry) => entry.title || entry.details)) {
    // Soft project recovery: dedicated PROJECTS section only (avoid scraping experience bullets).
    const projectSectionMatch = text.match(
      /(?:^|\n)\s*(?:key\s+|selected\s+|personal\s+|academic\s+)?projects?\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:education|certifications?|achievements?|awards?|skills?|work\s+experience|experience|additional)\b|$)/i,
    );
    const projectSource = projectSectionMatch?.[1]?.trim() || '';
    const fromSection = projectSource ? parseProjectBlocks(projectSource) : [];
    const projects = fromSection.map((entry) => ({
      ...entry,
      title: resolveProjectDisplayTitle(entry),
    }));
    if (projects.length > 0 && projects.length <= 8) {
      next.projectsList = projects.slice(0, 6);
    }
  }

  return next;
}

export function parseResumeContent(content: string, targetRole = ''): ResumeDraft {
  const draft = createEmptyDraft(targetRole);
  const text = sanitizeExtractedText(content?.trim() ?? '');
  if (!text) return draft;
  draft.originalText = text;

  const lines = text.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, ' '));
  const clean = lines.map((line) => line.trim()).filter((line) => line && !isNoiseLine(line));

  const nameCandidate = clean.slice(0, 8).find((line) => looksLikePersonName(line));
  if (nameCandidate) {
    draft.fullName = sanitizeExtractedText(nameCandidate);
  }

  // Prefer the user's target role as the subtitle under the name (cross-field JD alignment).
  const roleTarget = targetRole.trim();
  if (roleTarget) {
    draft.role = roleTarget;
  } else if (
    clean[1] &&
    clean[1].length < 70 &&
    !matchTopSection(clean[1]) &&
    !/@|http|linkedin|github|\+|^\d/i.test(clean[1]) &&
    clean[1] !== draft.fullName
  ) {
    draft.role = sanitizeExtractedText(clean[1]);
  }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  const linkedinMatch = text.match(/(linkedin\.com\/in\/[^\s/]+\/?)/i);
  const githubMatch = text.match(/(github\.com\/[^\s/]+)/i);
  const portfolioMatch = text.match(/([a-z0-9-]+\.vercel\.app\/?)/i);
  const locationMatch = clean.find(
    (line) =>
      (/\b(India|USA|UK|UAE|Canada|Australia|Germany|Remote)\b/i.test(line) ||
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2}\b/.test(line) ||
        /\b(Indore|Mumbai|Bangalore|Bengaluru|Delhi|Pune|Hyderabad|Chennai|Kolkata|Noida|Gurgaon|Gurugram)\b/i.test(
          line,
        )) &&
      line.length < 50 &&
      !/@|http/i.test(line),
  );

  if (emailMatch) draft.email = emailMatch[0];
  if (phoneMatch) draft.phone = phoneMatch[0].trim();
  if (linkedinMatch) draft.linkedin = linkedinMatch[0];
  if (locationMatch) draft.location = locationMatch;

  let current: ParseBucket | null = null;
  const buckets: Partial<Record<ParseBucket, string[]>> = {};
  const skillExtra: string[] = [];
  const preamble: string[] = [];
  let captureSkillsInExperience = false;
  let sawAnySection = false;

  const pushBucket = (key: ParseBucket, value: string) => {
    const list = buckets[key] ?? [];
    list.push(value);
    buckets[key] = list;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || isNoiseLine(line)) {
      if (current && current !== 'additional') buckets[current]?.push('');
      continue;
    }

    // Inline "Interests: Chess, Reading" / "GitHub: github.com/x" anywhere.
    const inlineCustom = line.match(/^([A-Za-z][A-Za-z\s/]{0,28}?)\s*:\s*(.+)$/);
    if (inlineCustom) {
      const labelKind = matchCustomFieldLabel(inlineCustom[1]!.trim());
      if (labelKind && labelKind !== 'additional') {
        pushBucket(labelKind, inlineCustom[2]!.trim());
        current = labelKind;
        sawAnySection = true;
        continue;
      }
    }

    const section = matchTopSection(line);
    if (section) {
      current = section;
      if (section !== 'additional') buckets[current] ??= [];
      captureSkillsInExperience = false;
      sawAnySection = true;
      continue;
    }

    if (/^skills$/i.test(line) && current === 'experience') {
      captureSkillsInExperience = true;
      continue;
    }

    if (/^responsibilities$/i.test(line) && current === 'experience') {
      captureSkillsInExperience = false;
      pushBucket('experience', 'Responsibilities:');
      continue;
    }

    if (!current) {
      // Keep pre-header lines for summary recovery when headers are missing.
      if (!sawAnySection && !isContactOrMetaLine(line) && line !== draft.fullName) {
        preamble.push(line);
      }
      continue;
    }

    if (current === 'additional') {
      // Orphan lines under ADDITIONAL without a label are ignored (prevents Interests pollution).
      continue;
    }

    if (
      current === 'interests' ||
      current === 'languages' ||
      current === 'github' ||
      current === 'portfolio'
    ) {
      if (current === 'interests' && isLinkOrMetaCustomValue(line)) continue;
      if (matchCustomFieldLabel(line)) {
        const nextLabel = matchCustomFieldLabel(line)!;
        if (nextLabel !== 'additional') {
          current = nextLabel;
          buckets[current] ??= [];
        }
        continue;
      }
      pushBucket(current, line);
      continue;
    }

    if (captureSkillsInExperience || current === 'skills') {
      if (!isSkillLabelNoise(line) && !isContactOrMetaLine(line)) skillExtra.push(line);
      if (current === 'skills' && !isSkillLabelNoise(line)) {
        pushBucket('skills', line);
      }
      continue;
    }

    if (current === 'experience' && isSkillDumpLine(line)) {
      const extracted = splitSkillTokens(line);
      if (extracted.length > 0) skillExtra.push(extracted.join(', '));
      continue;
    }

    pushBucket(current, raw);
  }

  const summaryRaw = (buckets.summary ?? preamble)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isContactOrMetaLine(line));
  const prose = summaryRaw.filter((line) => line.length > 50);
  draft.summary = (prose.length ? prose : summaryRaw).join(' ').replace(/\s+/g, ' ').trim();
  draft.education = (buckets.education ?? []).join('\n').trim();
  draft.certifications = (buckets.certifications ?? []).join('\n').trim();
  draft.achievements = (buckets.achievements ?? []).join('\n').trim();
  draft.skillsList = mergeSkillLists(
    splitSkillTokens([...(buckets.skills ?? []), ...skillExtra].join('\n')),
    // Soft whole-doc skill pass so catalog skills are not lost when SKILLS header is missing.
    buckets.skills?.length ? [] : splitSkillTokens(text).slice(0, 24),
  );
  draft.experiences = parseExperienceBlocks((buckets.experience ?? []).join('\n'));
  draft.projectsList = parseProjectBlocks((buckets.projects ?? []).join('\n'));

  // No EXPERIENCE header but date lines exist → still parse from full body.
  if (draft.experiences.length === 0 && lines.some((line) => JOB_DATE_LINE.test(line.trim()))) {
    draft.experiences = parseExperienceBlocks(text);
  }

  const joinCustom = (key: Exclude<CustomFieldLabel, 'additional'>) =>
    (buckets[key] ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => (key === 'interests' ? !isLinkOrMetaCustomValue(line) : true))
      .join(key === 'interests' || key === 'languages' ? ', ' : '\n')
      .replace(/,\s*,/g, ', ')
      .trim();

  const pushUniqueCustom = (label: string, value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    const exists = draft.customFields.some(
      (field) =>
        field.label.toLowerCase() === label.toLowerCase() &&
        field.value.trim().toLowerCase() === cleaned.toLowerCase(),
    );
    if (exists) return;
    const sameLabel = draft.customFields.find(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    if (sameLabel) {
      // Prefer the richer / first non-link value; don't concatenate GitHub into Interests.
      if (!sameLabel.value.trim()) sameLabel.value = cleaned;
      return;
    }
    draft.customFields.push({ id: newId(), label, value: cleaned });
  };

  for (const key of ['languages', 'interests', 'github', 'portfolio'] as const) {
    const value = joinCustom(key);
    if (value) pushUniqueCustom(CUSTOM_LABEL_TITLE[key], value);
  }

  if (githubMatch) pushUniqueCustom('GitHub', githubMatch[0]);
  if (portfolioMatch) pushUniqueCustom('Portfolio', portfolioMatch[0]);

  // Strip any Interests value that accidentally absorbed links.
  draft.customFields = draft.customFields
    .map((field) => {
      if (!/^interests?$/i.test(field.label)) return field;
      const cleaned = field.value
        .split(/,|\n/)
        .map((part) => part.trim())
        .filter((part) => part && !isLinkOrMetaCustomValue(part) && !matchCustomFieldLabel(part))
        .join(', ');
      return { ...field, value: cleaned };
    })
    .filter((field) => field.value.trim() || !/^interests?$/i.test(field.label));

  const normalized = normalizeDraft(draft);
  if (isSparseDraft(normalized)) {
    return normalizeDraft(recoverUnstructuredContent(normalized, text));
  }

  // Partial recovery: fill only the empty slots.
  let filled = normalized;
  if (
    !filled.summary ||
    filled.skillsList.length === 0 ||
    filled.experiences.length === 0 ||
    !filled.education
  ) {
    const recovered = recoverUnstructuredContent(filled, text);
    filled = normalizeDraft({
      ...filled,
      fullName: filled.fullName || recovered.fullName,
      summary: filled.summary || recovered.summary,
      skillsList: filled.skillsList.length > 0 ? filled.skillsList : recovered.skillsList,
      experiences: filled.experiences.length > 0 ? filled.experiences : recovered.experiences,
      projectsList: filled.projectsList.length > 0 ? filled.projectsList : recovered.projectsList,
      education: filled.education || recovered.education,
    });
  }

  return filled;
}
