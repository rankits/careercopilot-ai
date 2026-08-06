import { prisma } from '@/shared/config/db.conf.js';
import { clampScore } from '@/modules/resume-analysis/utils/text-match.js';
import { normalizeProfessionalSkills } from '@/modules/resumes/utils/skill-normalizer.js';
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

/** Pull skills from structured parse so gap analysis does not miss table/section skills. */
export const collectStructuredResumeSkills = (parsed: unknown): string[] => {
  if (!parsed || typeof parsed !== 'object') return [];
  const data = parsed as Record<string, unknown>;
  const raw = data.skills ?? data.Skills ?? data.skillBlocks ?? data.skillset;
  const bag: string[] = [];

  const pushValue = (value: unknown): void => {
    if (typeof value === 'string' && value.trim()) {
      bag.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    if (typeof row.name === 'string') bag.push(row.name);
    if (typeof row.skill === 'string') bag.push(row.skill);
    for (const key of ['technical', 'tools', 'frameworks', 'softSkills', 'domains', 'items']) {
      if (key in row) pushValue(row[key]);
    }
  };

  pushValue(raw);
  return normalizeProfessionalSkills(bag);
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
  const skillsAppendix =
    structuredSkills.length > 0 ? `\n\nSKILLS\n${structuredSkills.join(', ')}\n` : '';

  if (extraction?.extractedText?.trim()) {
    return `${extraction.extractedText.trim()}${skillsAppendix}`;
  }

  if (parsedData && typeof parsedData === 'object') {
    return `${JSON.stringify(parsedData, null, 2)}${skillsAppendix}`;
  }

  return `Resume file: ${resume.originalName}${skillsAppendix}`;
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
