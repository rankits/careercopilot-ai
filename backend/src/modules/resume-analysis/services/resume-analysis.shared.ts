import { prisma } from '@/shared/config/db.conf.js';
import { clampScore } from '@/modules/resume-analysis/utils/text-match.js';
import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkills,
} from '@/modules/resumes/utils/skill-normalizer.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  AnalysisDetails,
  SectionScores,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';

export const EMPTY_SKILL_ANALYSIS: SkillAnalysis = {
  matchedSkills: [],
  missingSkills: [],
  transferableSkills: [],
  additionalSkills: [],
  recommendedSkills: [],
};

export const EMPTY_SECTION_SCORES: SectionScores = {
  summary: 0,
  experience: 0,
  skills: 0,
  education: 0,
  projects: 0,
  achievements: 0,
};

/**
 * Throws 404 (indistinguishable from missing) unless `resumeId` belongs to `userId`.
 * Callers must never branch on "exists but not mine" vs "doesn't exist".
 */
export const assertOwnedResume = async (resumeId: string, userId: string) => {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }
  return resume;
};

export const ownedAnalysisWhere = (resumeId: string, userId: string) => ({
  resumeId,
  resume: { userId },
});

const MIN_USEFUL_EXTRACT_CHARS = 120;

const pushSkillValue = (bag: string[], value: unknown): void => {
  if (typeof value === 'string' && value.trim()) {
    bag.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => pushSkillValue(bag, item));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  if (typeof row.name === 'string') bag.push(row.name);
  if (typeof row.skill === 'string') bag.push(row.skill);
  if (typeof row.technology === 'string') bag.push(row.technology);
  for (const key of [
    'technical',
    'tools',
    'frameworks',
    'softSkills',
    'domains',
    'items',
    'technologies',
    'techStack',
    'stack',
  ]) {
    if (key in row) pushSkillValue(bag, row[key]);
  }
};

/**
 * Pull skills from structured parse so gap analysis does not miss table/section skills.
 * Includes experience/project technologies and keeps raw non-catalog terms (not only taxonomy hits).
 */
export const collectStructuredResumeSkills = (parsed: unknown): string[] => {
  if (!parsed || typeof parsed !== 'object') return [];
  const data = parsed as Record<string, unknown>;
  const bag: string[] = [];

  pushSkillValue(bag, data.skills ?? data.Skills ?? data.skillBlocks ?? data.skillset);

  const experience = data.experience ?? data.Experience ?? data.workExperience ?? data.employment;
  if (Array.isArray(experience)) {
    for (const row of experience) {
      if (!row || typeof row !== 'object') continue;
      const entry = row as Record<string, unknown>;
      pushSkillValue(bag, entry.technologies ?? entry.techStack ?? entry.skills ?? entry.tools);
    }
  }

  const projects = data.projects ?? data.Projects;
  if (Array.isArray(projects)) {
    for (const row of projects) {
      if (!row || typeof row !== 'object') continue;
      const entry = row as Record<string, unknown>;
      pushSkillValue(bag, entry.technologies ?? entry.techStack ?? entry.skills ?? entry.tools);
    }
  }

  const catalog = normalizeProfessionalSkills(bag);
  const seen = new Set(catalog.map((skill) => skill.toLowerCase()));
  const extras: string[] = [];
  for (const raw of bag) {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length > 48) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    extras.push(trimmed);
  }

  return [...catalog, ...extras];
};

const asLines = (value: unknown): string[] => {
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => asLines(item));
  }
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (typeof row.text === 'string') return asLines(row.text);
    if (typeof row.description === 'string') return asLines(row.description);
    if (Array.isArray(row.bullets)) return asLines(row.bullets);
    if (Array.isArray(row.responsibilities)) return asLines(row.responsibilities);
  }
  return [];
};

/**
 * Rebuild clean resume prose from structured parse data.
 * Prefer this over JSON.stringify so skill grounding can match natural-language tokens.
 */
export const reconstructPlainTextFromParsedData = (parsed: unknown): string => {
  if (!parsed || typeof parsed !== 'object') return '';
  const data = parsed as Record<string, unknown>;
  const blocks: string[] = [];

  const name =
    (typeof data.fullName === 'string' && data.fullName) ||
    (typeof data.name === 'string' && data.name) ||
    '';
  const role =
    (typeof data.title === 'string' && data.title) ||
    (typeof data.role === 'string' && data.role) ||
    (typeof data.headline === 'string' && data.headline) ||
    '';
  if (name.trim()) blocks.push(name.trim());
  if (role.trim()) blocks.push(role.trim());

  const contactBits = [data.email, data.phone, data.location, data.linkedin]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
  if (contactBits.length > 0) blocks.push(contactBits.join(' | '));

  const summary =
    (typeof data.summary === 'string' && data.summary) ||
    (typeof data.professionalSummary === 'string' && data.professionalSummary) ||
    (typeof data.profile === 'string' && data.profile) ||
    '';
  if (summary.trim()) {
    blocks.push('PROFESSIONAL SUMMARY');
    blocks.push(summary.trim());
  }

  const skills = collectStructuredResumeSkills(parsed);
  if (skills.length > 0) {
    blocks.push('SKILLS');
    blocks.push(skills.join(', '));
  }

  const experience = data.experience ?? data.Experience ?? data.workExperience ?? data.employment;
  if (Array.isArray(experience) && experience.length > 0) {
    blocks.push('WORK EXPERIENCE');
    for (const row of experience) {
      if (!row || typeof row !== 'object') continue;
      const entry = row as Record<string, unknown>;
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      const company = typeof entry.company === 'string' ? entry.company.trim() : '';
      const start = typeof entry.startDate === 'string' ? entry.startDate.trim() : '';
      const end = typeof entry.endDate === 'string' ? entry.endDate.trim() : '';
      const header = [title, company].filter(Boolean).join(' | ');
      const dates = [start, end].filter(Boolean).join(' – ');
      if (header) blocks.push(header);
      if (dates) blocks.push(dates);
      for (const line of asLines(
        entry.bullets ?? entry.responsibilities ?? entry.description ?? entry.details,
      )) {
        blocks.push(`- ${line.replace(/^[-*•]\s*/, '')}`);
      }
      const tech = entry.technologies ?? entry.techStack ?? entry.skills;
      if (tech) {
        const techLine = Array.isArray(tech)
          ? tech.filter((item): item is string => typeof item === 'string').join(', ')
          : typeof tech === 'string'
            ? tech
            : '';
        if (techLine.trim()) blocks.push(`Technologies: ${techLine.trim()}`);
      }
    }
  }

  const projects = data.projects ?? data.Projects;
  if (Array.isArray(projects) && projects.length > 0) {
    blocks.push('PROJECTS');
    for (const row of projects) {
      if (!row || typeof row !== 'object') continue;
      const entry = row as Record<string, unknown>;
      const title =
        (typeof entry.title === 'string' && entry.title) ||
        (typeof entry.name === 'string' && entry.name) ||
        '';
      if (title.trim()) blocks.push(title.trim());
      for (const line of asLines(entry.bullets ?? entry.description ?? entry.details)) {
        blocks.push(`- ${line.replace(/^[-*•]\s*/, '')}`);
      }
      const tech = entry.technologies ?? entry.techStack ?? entry.skills;
      if (tech) {
        const techLine = Array.isArray(tech)
          ? tech.filter((item): item is string => typeof item === 'string').join(', ')
          : typeof tech === 'string'
            ? tech
            : '';
        if (techLine.trim()) blocks.push(`Technologies: ${techLine.trim()}`);
      }
    }
  }

  const education = data.education ?? data.Education;
  if (typeof education === 'string' && education.trim()) {
    blocks.push('EDUCATION');
    blocks.push(education.trim());
  } else if (Array.isArray(education) && education.length > 0) {
    blocks.push('EDUCATION');
    for (const row of education) {
      if (typeof row === 'string' && row.trim()) {
        blocks.push(row.trim());
        continue;
      }
      if (!row || typeof row !== 'object') continue;
      const entry = row as Record<string, unknown>;
      const degree = typeof entry.degree === 'string' ? entry.degree.trim() : '';
      const school = typeof entry.school === 'string' ? entry.school.trim() : '';
      const line = [degree, school].filter(Boolean).join(' — ');
      if (line) blocks.push(line);
    }
  }

  const certifications = data.certifications ?? data.Certifications;
  if (typeof certifications === 'string' && certifications.trim()) {
    blocks.push('CERTIFICATIONS');
    blocks.push(certifications.trim());
  } else if (Array.isArray(certifications) && certifications.length > 0) {
    blocks.push('CERTIFICATIONS');
    for (const row of certifications) {
      if (typeof row === 'string' && row.trim()) blocks.push(row.trim());
    }
  }

  return blocks.join('\n').trim();
};

export const getResumeText = async (resumeId: string, userId?: string): Promise<string> => {
  if (userId) {
    await assertOwnedResume(resumeId, userId);
  }

  const extraction = await prisma.resumeExtraction.findFirst({
    where: { parseRun: { resumeId } },
    orderBy: { createdAt: 'desc' },
    select: { extractedText: true, extractedData: true },
  });

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: {
      parseRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { parsedData: true },
      },
    },
  });

  if (!resume) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  const parsedData = resume.parseRuns[0]?.parsedData ?? extraction?.extractedData ?? null;
  const structuredSkills = collectStructuredResumeSkills(parsedData);
  const reconstructed = reconstructPlainTextFromParsedData(parsedData);
  const extracted = extraction?.extractedText?.trim() ?? '';

  // Prefer useful plain extract; fall back to reconstructed prose (never JSON.stringify).
  let body = '';
  if (extracted.length >= MIN_USEFUL_EXTRACT_CHARS) {
    body = extracted;
  } else if (reconstructed.length > 0) {
    // Short/lossy extract may still hold unique tokens — keep it ahead of reconstruction.
    body =
      extracted.length > 0 &&
      !reconstructed.toLowerCase().includes(extracted.toLowerCase().slice(0, 40))
        ? `${extracted}\n\n${reconstructed}`
        : reconstructed;
  } else if (extracted.length > 0) {
    body = extracted;
  } else {
    body = `Resume file: ${resume.originalName}`;
  }

  // Always surface catalog skills near the top so AI truncation + grounding see them
  // (PDF multi-column / bullet layouts often bury or scramble the Skills section).
  const textSkills = extractProfessionalSkillsFromText(body);
  const allSkills = normalizeProfessionalSkills([...structuredSkills, ...textSkills]);
  if (allSkills.length === 0) return body;

  const skillsBlock = `SKILLS\n${allSkills.join(', ')}`;
  return `${skillsBlock}\n\n${body}\n`;
};

export const parseAnalysisDetails = (value: unknown): AnalysisDetails | null => {
  if (!value || typeof value !== 'object') return null;
  const details = value as Partial<AnalysisDetails>;
  return {
    formattingScore: clampScore(details.formattingScore ?? 0),
    skillAnalysis: details.skillAnalysis ?? EMPTY_SKILL_ANALYSIS,
    sectionScores: details.sectionScores ?? EMPTY_SECTION_SCORES,
    atsIssues: details.atsIssues ?? [],
    optimizedSections: details.optimizedSections ?? {
      professionalSummary: '',
      skills: [],
      experienceBullets: [],
      projectBullets: [],
    },
    optimizedResumeText: details.optimizedResumeText ?? '',
    enterpriseOptimization: details.enterpriseOptimization,
    missingKeywordReasons: details.missingKeywordReasons ?? {},
    baselineAtsScore:
      typeof details.baselineAtsScore === 'number'
        ? clampScore(details.baselineAtsScore)
        : undefined,
    invalidTarget: details.invalidTarget === true,
    invalidTargetMessage:
      typeof details.invalidTargetMessage === 'string' ? details.invalidTargetMessage : undefined,
  };
};

export const shapeAnalysisResponse = <
  T extends {
    status: string;
    weaknesses?: string[];
    atsScore: number;
    formattingScore: number;
    analysisDetails: unknown;
    keywords: Array<{ id: number; term: string; status: string; importance: string }>;
    suggestions: Array<{
      id: number;
      title: string;
      category: string;
      originalText: string;
      suggestedText: string;
      reason: string;
      impact: string;
      status: string;
    }>;
  },
>(
  analysis: T,
) => {
  const details = parseAnalysisDetails(analysis.analysisDetails);
  const reasons = details?.missingKeywordReasons ?? {};

  return {
    ...analysis,
    formattingScore: analysis.formattingScore ?? details?.formattingScore ?? 0,
    skillAnalysis: details?.skillAnalysis ?? EMPTY_SKILL_ANALYSIS,
    sectionScores: details?.sectionScores ?? EMPTY_SECTION_SCORES,
    atsIssues: details?.atsIssues ?? [],
    analysisDetails: details,
    baselineAtsScore: details?.baselineAtsScore ?? analysis.atsScore,
    optimizedSummary: details?.optimizedSections?.professionalSummary ?? '',
    invalidTarget: details?.invalidTarget === true,
    invalidTargetMessage: details?.invalidTargetMessage,
    failureReason:
      analysis.status === 'FAILED' ? (analysis.weaknesses?.[0] ?? 'Analysis failed') : undefined,
    keywords: analysis.keywords.map((keyword) => ({
      ...keyword,
      reason: reasons[keyword.term],
    })),
    suggestions: analysis.suggestions.map((suggestion) => ({
      ...suggestion,
      reason: suggestion.reason || undefined,
    })),
  };
};

export const scoreLabel = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};
