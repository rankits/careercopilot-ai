import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { resumeAnalysisAiClient } from '@/modules/resume-analysis/ai/resume-analysis-ai.client.js';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
import { buildWorkingResumeContent } from '@/modules/resume-analysis/utils/merge-resume-content.js';
import { buildJdCoverageExtras } from '@/modules/resume-analysis/utils/suggestion-coverage.js';
import {
  clampScore,
  replaceTextFuzzy,
  termAppearsIn,
  uniqSkills,
} from '@/modules/resume-analysis/utils/text-match.js';
import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkills,
  skillAppearsIn,
  skillMatchKey,
} from '@/modules/resumes/utils/skill-normalizer.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  AiAnalysisOutput,
  AnalysisDetails,
  AnalysisInput,
  AtsIssue,
  ExportResult,
  RecheckResult,
  SectionScores,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';

type AiKeyword = AiAnalysisOutput['missingKeywords'][number];
type AiSuggestion = AiAnalysisOutput['suggestions'][number];

const EMPTY_SKILL_ANALYSIS: SkillAnalysis = {
  matchedSkills: [],
  missingSkills: [],
  transferableSkills: [],
  additionalSkills: [],
  recommendedSkills: [],
};

const EMPTY_SECTION_SCORES: SectionScores = {
  summary: 0,
  experience: 0,
  skills: 0,
  education: 0,
  projects: 0,
  achievements: 0,
};

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/** Throws (as a 404, indistinguishable from a non-existent id) unless `resumeId`
 * belongs to `userId` - callers must never branch on "exists but not mine" vs.
 * "doesn't exist" to avoid leaking resume existence via IDOR probing. */
const assertOwnedResume = async (resumeId: string, userId: string) => {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== userId) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }
  return resume;
};

/** Same ownership guard as `assertOwnedResume`, but for saved-version routes that
 * are keyed by `versionId` rather than `resumeId` - walks version -> analysis -> resume. */
const assertOwnedVersion = async (versionId: number, userId: string) => {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: versionId },
    include: { analysis: { select: { resume: { select: { userId: true } } } } },
  });
  if (!version || version.analysis.resume.userId !== userId) {
    throw new AppError('Saved resume version not found', 404, 'VERSION_NOT_FOUND');
  }
  return version;
};

const buildExportContent = (input: {
  baseName: string;
  targetRole?: string;
  atsScore?: number;
  content: string;
}) =>
  [
    `=== ${input.baseName} ===`,
    `Optimized for: ${input.targetRole ?? 'N/A'}`,
    `ATS Score: ${input.atsScore ?? 0}/100`,
    '',
    input.content,
  ].join('\n');

const getResumeText = async (resumeId: string): Promise<string> => {
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
    throw new AppError('Resume not found', 404);
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

/** Pull skills from structured parse so gap analysis does not miss table/section skills. */
const collectStructuredResumeSkills = (parsed: unknown): string[] => {
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

const toAnalysisDetails = (
  aiResult: AiAnalysisOutput,
  baselineAtsScore: number,
): AnalysisDetails => ({
  formattingScore: clampScore(aiResult.formattingScore),
  skillAnalysis: aiResult.skillAnalysis ?? EMPTY_SKILL_ANALYSIS,
  sectionScores: aiResult.sectionScores ?? EMPTY_SECTION_SCORES,
  atsIssues: aiResult.atsIssues ?? [],
  optimizedSections: aiResult.optimizedSections,
  optimizedResumeText: aiResult.optimizedResumeText ?? '',
  enterpriseOptimization: {
    experienceRelevance: clampScore(aiResult.experienceRelevance ?? 0),
    resumeStrength: clampScore(aiResult.resumeStrength ?? 0),
    industryAlignment: clampScore(aiResult.industryAlignment ?? 0),
    recruiterReadability: clampScore(aiResult.recruiterReadability ?? aiResult.readability),
    interviewReadiness: clampScore(aiResult.interviewReadiness ?? 0),
    improvedSummary:
      aiResult.improvedSummary ?? aiResult.optimizedSections?.professionalSummary ?? '',
    improvedExperience: aiResult.improvedExperience ?? [],
    improvedProjects: aiResult.improvedProjects ?? [],
    improvedSkills: aiResult.improvedSkills ?? aiResult.optimizedSections?.skills ?? [],
    recommendedSkillOrder:
      aiResult.recommendedSkillOrder ??
      aiResult.improvedSkills ??
      aiResult.optimizedSections?.skills ??
      [],
    atsSuggestions: aiResult.atsSuggestions ?? [],
    grammarSuggestions: aiResult.grammarSuggestions ?? [],
    finalResume: aiResult.finalResume ?? {},
  },
  missingKeywordReasons: Object.fromEntries(
    (aiResult.missingKeywords ?? [])
      .filter((keyword) => keyword.reason)
      .map((keyword) => [keyword.term, keyword.reason ?? '']),
  ),
  baselineAtsScore,
});

const parseAnalysisDetails = (value: unknown): AnalysisDetails | null => {
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

const toKeywordCreateInput = (
  analysisId: number,
  keyword: AiKeyword,
  status: 'MISSING' | 'MATCHED',
) => ({
  analysisId,
  term: keyword.term,
  status,
  importance: keyword.importance,
});

const toSuggestionCreateInput = (analysisId: number, suggestion: AiSuggestion) => ({
  analysisId,
  title: suggestion.title,
  category: suggestion.category,
  originalText: suggestion.originalText,
  suggestedText: suggestion.suggestedText,
  reason: suggestion.reason ?? '',
  impact: suggestion.impact,
  status: 'PENDING' as const,
});

/** Guarantee Optimize-step suggestions cover JD skills / summary even when AI returned some. */
const ensureFallbackSuggestions = (
  analysisId: number,
  aiResult: AiAnalysisOutput,
  resumeText: string,
  targetRole?: string,
): ReturnType<typeof toSuggestionCreateInput>[] => {
  const fromAi = (aiResult.suggestions ?? []).map((suggestion) =>
    toSuggestionCreateInput(analysisId, suggestion),
  );

  const missing = [
    ...(aiResult.skillAnalysis?.missingSkills ?? []),
    ...(aiResult.skillAnalysis?.recommendedSkills ?? []),
    ...(aiResult.missingSkills ?? []),
  ];
  const improvedSummary =
    aiResult.optimizedSections?.professionalSummary?.trim() ||
    aiResult.improvedSummary?.trim() ||
    '';
  const summaryMatch = resumeText.match(
    /(?:professional\s+)?summary[:\s]+([\s\S]{40,500}?)(?:\n\s*\n|work\s+experience|skills|education|projects)/i,
  );
  const expBullet = aiResult.optimizedSections?.experienceBullets?.[0];

  const coverage = buildJdCoverageExtras({
    missingSkills: missing,
    currentSkillsLine: (aiResult.optimizedSections?.skills ?? []).join(', '),
    improvedSummary,
    targetRole,
    experience: expBullet?.optimizedText
      ? { originalText: expBullet.originalText || '', optimizedText: expBullet.optimizedText }
      : null,
    existing: fromAi,
  }).map((item) =>
    toSuggestionCreateInput(analysisId, {
      ...item,
      originalText:
        item.category === 'summary' && summaryMatch?.[1]
          ? summaryMatch[1].trim()
          : item.originalText,
    }),
  );

  const merged = [...fromAi, ...coverage];
  if (merged.length > 0) return merged;

  const stillMissing = [
    ...(aiResult.skillAnalysis?.missingSkills ?? []),
    ...(aiResult.missingSkills ?? []),
  ].filter(Boolean);
  if (stillMissing.length === 0) return [];

  return [
    toSuggestionCreateInput(analysisId, {
      id: 'fallback-review-skills',
      title: 'Add missing JD skills to Skills section',
      category: 'skills',
      originalText: '',
      suggestedText: stillMissing.slice(0, 12).join(', '),
      impact: 'HIGH',
      reason:
        'AI returned no rewrite suggestions. Add these JD skills where they are factually true.',
    }),
  ];
};

/** Refresh matched/missing from JD skill pool vs resume text (AI lists + JD extract). */
const refreshSkillGapFromContent = (
  content: string,
  jobDescription: string | undefined,
  aiResult: AiAnalysisOutput,
  /** Prefer also scanning the raw upload so AI rewrites cannot create false misses. */
  originalResumeText?: string,
): SkillAnalysis => {
  const jdSkillPool = normalizeProfessionalSkills([
    ...(aiResult.skillAnalysis?.matchedSkills ?? []),
    ...(aiResult.skillAnalysis?.missingSkills ?? []),
    ...(aiResult.skillAnalysis?.recommendedSkills ?? []),
    ...(aiResult.missingSkills ?? []),
    ...extractProfessionalSkillsFromText(jobDescription ?? ''),
  ]);

  const byKey = new Map<string, string>();
  for (const skill of jdSkillPool) {
    const key = skillMatchKey(skill);
    if (key && !byKey.has(key)) byKey.set(key, skill);
  }
  const pool = Array.from(byKey.values());

  // Union of working + original extract — if the uploaded resume has the skill, it is matched.
  const haystack = [content, originalResumeText ?? ''].filter((part) => part.trim()).join('\n\n');

  const matchedSkills = pool.filter((skill) => skillAppearsIn(haystack, skill));
  const missingSkills = pool.filter((skill) => !skillAppearsIn(haystack, skill));

  return {
    matchedSkills,
    missingSkills,
    transferableSkills: normalizeProfessionalSkills(
      aiResult.skillAnalysis?.transferableSkills ?? [],
    ),
    additionalSkills: normalizeProfessionalSkills(
      aiResult.skillAnalysis?.additionalSkills ?? aiResult.additionalSkillsFound ?? [],
    ),
    recommendedSkills: missingSkills,
  };
};

/** Ensure strengths / weaknesses / ATS issues always populate for Step 3 UI. */
const ensureAnalysisInsights = (
  aiResult: AiAnalysisOutput,
  skills: SkillAnalysis,
): { strengths: string[]; weaknesses: string[]; atsIssues: AtsIssue[] } => {
  const strengths = [...(aiResult.strengths ?? [])].filter((item) => item.trim().length > 0);
  const weaknesses = [...(aiResult.weaknesses ?? [])].filter((item) => item.trim().length > 0);
  const atsIssues: AtsIssue[] = [...(aiResult.atsIssues ?? [])].filter(
    (item) => item.issue?.trim() && item.fix?.trim(),
  );

  if (strengths.length === 0 && skills.matchedSkills.length > 0) {
    strengths.push(`Matched JD skills: ${skills.matchedSkills.slice(0, 6).join(', ')}`);
  }
  if (strengths.length === 0) {
    strengths.push('Resume text is structured enough for ATS parsing.');
  }

  if (skills.missingSkills.length > 0) {
    const gapLine = `Missing JD skills: ${skills.missingSkills.slice(0, 10).join(', ')}`;
    if (!weaknesses.some((item) => /missing|skill gap/i.test(item))) {
      weaknesses.push(gapLine);
    }
    if (!atsIssues.some((item) => /skill/i.test(item.section) || /skill gap/i.test(item.issue))) {
      atsIssues.push({
        issue: 'Skill gap versus job description',
        section: 'skills',
        severity: 'HIGH',
        fix: `Add factual skills or transferable wording for: ${skills.missingSkills.slice(0, 8).join(', ')}`,
      });
    }
  }

  const experienceRelevance = clampScore(aiResult.experienceRelevance ?? 0);
  if (
    experienceRelevance > 0 &&
    experienceRelevance < 45 &&
    !atsIssues.some((item) => /experience/i.test(item.section))
  ) {
    atsIssues.push({
      issue: 'Experience alignment is weak for the target role',
      section: 'experience',
      severity: 'HIGH',
      fix: 'Reframe experience bullets toward JD responsibilities using transferable language — do not invent employers or tools.',
    });
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Continue aligning keywords and quantified impact with the job description.');
  }

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 7),
    atsIssues: atsIssues.slice(0, 8),
  };
};

/** Build full keyword rows: AI lists + every missing/matched skill, status from resume content. */
const buildKeywordCreateData = (
  analysisId: number,
  content: string,
  aiResult: AiAnalysisOutput,
  skills: SkillAnalysis,
): ReturnType<typeof toKeywordCreateInput>[] => {
  const byKey = new Map<string, ReturnType<typeof toKeywordCreateInput>>();

  const upsert = (keyword: AiKeyword, preferredStatus?: 'MISSING' | 'MATCHED') => {
    const term = normalizeProfessionalSkills([keyword.term])[0] ?? keyword.term.trim();
    if (!term) return;
    const key = skillMatchKey(term) || term.toLowerCase();
    const status = preferredStatus ?? (skillAppearsIn(content, term) ? 'MATCHED' : 'MISSING');
    const existing = byKey.get(key);
    // Prefer MATCHED when the term is evidenced on the resume.
    if (existing?.status === 'MATCHED') return;
    if (existing && status === 'MISSING') return;
    byKey.set(key, toKeywordCreateInput(analysisId, { ...keyword, term }, status));
  };

  for (const keyword of aiResult.matchedKeywords ?? []) {
    upsert(keyword, skillAppearsIn(content, keyword.term) ? 'MATCHED' : 'MISSING');
  }
  for (const keyword of aiResult.missingKeywords ?? []) {
    upsert(keyword, skillAppearsIn(content, keyword.term) ? 'MATCHED' : 'MISSING');
  }
  for (const skill of skills.matchedSkills) {
    upsert(
      { term: skill, importance: 'high', reason: 'Matched against the job description.' },
      'MATCHED',
    );
  }
  for (const skill of skills.missingSkills) {
    upsert(
      {
        term: skill,
        importance: 'high',
        reason: `${skill} appears in the job description and is missing from the resume.`,
      },
      'MISSING',
    );
  }

  return Array.from(byKey.values());
};

const scoreLabel = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

const runAnalysisJob = async (analysisId: number, input: AnalysisInput): Promise<void> => {
  const { resumeId, targetRole, experienceLevel, jobDescription } = input;

  try {
    logger.info({ resumeId, analysisId, targetRole }, 'Resume analysis job started');

    // AI gate: nonsense / non-JD English / fake role → ATS 0 + Oops, no full analysis.
    const gate = await resumeAnalysisAiClient.validateTargetRoleAndJd(targetRole, jobDescription);
    if (!gate.valid) {
      const message =
        gate.message?.trim() ||
        'Oops! You added a wrong Target Role and Job Description. Please check them and try again.';
      await prisma.resumeKeyword.deleteMany({ where: { analysisId } });
      await prisma.resumeSuggestion.deleteMany({ where: { analysisId } });
      await prisma.resumeAnalysis.update({
        where: { id: analysisId },
        data: {
          atsScore: 0,
          keywordMatch: 0,
          skillMatch: 0,
          contentQuality: 0,
          readability: 0,
          formattingScore: 0,
          strengths: [],
          weaknesses: [message],
          analysisDetails: {
            formattingScore: 0,
            skillAnalysis: {
              matchedSkills: [],
              missingSkills: [],
              transferableSkills: [],
              recommendedSkills: [],
            },
            sectionScores: {
              summary: 0,
              experience: 0,
              skills: 0,
              education: 0,
              projects: 0,
              achievements: 0,
            },
            atsIssues: [],
            optimizedSections: {
              professionalSummary: '',
              skills: [],
              experienceBullets: [],
              projectBullets: [],
            },
            optimizedResumeText: '',
            missingKeywordReasons: {},
            baselineAtsScore: 0,
            invalidTarget: true,
            invalidTargetMessage: message,
          } as unknown as Prisma.InputJsonValue,
          editedContent: null,
          status: 'COMPLETED',
          currentStep: 3,
        },
      });
      logger.info(
        { resumeId, analysisId, message },
        'Resume analysis blocked: invalid target role / JD',
      );
      return;
    }

    const resumeText = await getResumeText(resumeId);
    const aiResult = await resumeAnalysisAiClient.analyze(
      resumeText,
      targetRole,
      experienceLevel,
      jobDescription,
    );

    const analysisDetails = toAnalysisDetails(aiResult, clampScore(aiResult.atsScore));
    const optimizedText = (aiResult.optimizedResumeText ?? '').trim();
    const improvedSummary =
      aiResult.optimizedSections?.professionalSummary?.trim() ||
      aiResult.improvedSummary?.trim() ||
      '';
    const crossDomain =
      (aiResult.skillAnalysis?.matchedSkills?.length ?? 0) === 0 &&
      (aiResult.skillAnalysis?.missingSkills?.length ?? 0) >= 2;

    // Keep the uploaded resume (name, experience, education). Only accept a full AI
    // rewrite when it is complete; otherwise patch target role + summary onto original.
    const workingContent = buildWorkingResumeContent({
      resumeText,
      optimizedText,
      targetRole,
      improvedSummary,
      preferOriginalBase: crossDomain,
    });

    // ATS source of truth = AI semantic JSON (not chip/catalog extractors).
    const aiSkills = aiResult.skillAnalysis ?? EMPTY_SKILL_ANALYSIS;
    const insights = ensureAnalysisInsights(aiResult, aiSkills);

    const baselineAts = clampScore(aiResult.atsScore);
    const keywordData = [
      ...(aiResult.matchedKeywords ?? []).map((keyword) =>
        toKeywordCreateInput(analysisId, keyword, 'MATCHED'),
      ),
      ...(aiResult.missingKeywords ?? []).map((keyword) =>
        toKeywordCreateInput(analysisId, keyword, 'MISSING'),
      ),
    ];

    analysisDetails.skillAnalysis = {
      matchedSkills: aiSkills.matchedSkills ?? [],
      missingSkills: aiSkills.missingSkills ?? [],
      transferableSkills: aiSkills.transferableSkills ?? [],
      additionalSkills: aiSkills.additionalSkills ?? aiResult.additionalSkillsFound ?? [],
      recommendedSkills: aiSkills.recommendedSkills ?? [],
    };
    analysisDetails.sectionScores = aiResult.sectionScores ?? EMPTY_SECTION_SCORES;
    analysisDetails.baselineAtsScore = baselineAts;
    analysisDetails.formattingScore = clampScore(aiResult.formattingScore);
    analysisDetails.atsIssues = insights.atsIssues;
    analysisDetails.missingKeywordReasons = {
      ...analysisDetails.missingKeywordReasons,
      ...Object.fromEntries(
        (aiResult.missingKeywords ?? [])
          .filter((keyword) => keyword.reason)
          .map((keyword) => [keyword.term, keyword.reason ?? '']),
      ),
    };

    await prisma.resumeKeyword.deleteMany({ where: { analysisId } });
    await prisma.resumeSuggestion.deleteMany({ where: { analysisId } });

    await prisma.resumeAnalysis.update({
      where: { id: analysisId },
      data: {
        atsScore: baselineAts,
        keywordMatch: clampScore(aiResult.keywordMatch),
        skillMatch: clampScore(aiResult.skillMatch),
        contentQuality: clampScore(aiResult.contentQuality),
        readability: clampScore(aiResult.readability),
        formattingScore: clampScore(aiResult.formattingScore),
        strengths: insights.strengths,
        weaknesses: insights.weaknesses,
        analysisDetails: analysisDetails as unknown as Prisma.InputJsonValue,
        editedContent: workingContent,
        status: 'COMPLETED',
        currentStep: 3,
      },
    });

    if (keywordData.length > 0) {
      await prisma.resumeKeyword.createMany({ data: keywordData });
    }

    const suggestionData = ensureFallbackSuggestions(
      analysisId,
      {
        ...aiResult,
        skillAnalysis: analysisDetails.skillAnalysis,
        missingSkills: analysisDetails.skillAnalysis.missingSkills,
        strengths: insights.strengths,
        weaknesses: insights.weaknesses,
        atsIssues: insights.atsIssues,
      },
      workingContent,
      targetRole,
    );
    if (suggestionData.length > 0) {
      await prisma.resumeSuggestion.createMany({ data: suggestionData });
    }

    logger.info(
      {
        resumeId,
        analysisId,
        atsScore: baselineAts,
        matchedSkills: analysisDetails.skillAnalysis.matchedSkills.length,
        missingSkills: analysisDetails.skillAnalysis.missingSkills.length,
        missingKeywords: keywordData.filter((row) => row.status === 'MISSING').length,
        atsIssues: insights.atsIssues.length,
      },
      'Resume analysis job completed',
    );
  } catch (err) {
    const failureReason = getErrorMessage(err);
    logger.error({ err, resumeId, analysisId, failureReason }, 'Resume analysis job failed');
    await prisma.resumeAnalysis
      .update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          weaknesses: [`Analysis failed: ${failureReason}`],
        },
      })
      .catch(() => undefined);
  }
};

const shapeAnalysisResponse = <
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

export const resumeAnalysisService = {
  async startAnalysis(input: AnalysisInput, userId: string) {
    const { resumeId, targetRole, experienceLevel, jobDescription } = input;

    await assertOwnedResume(resumeId, userId);

    const existingAnalysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    const analysis = await prisma.resumeAnalysis.upsert({
      where: { id: existingAnalysis?.id ?? -1 },
      create: {
        resumeId,
        targetRole,
        experienceLevel,
        jobDescription,
        status: 'ANALYZING',
        currentStep: 2,
      },
      update: {
        targetRole,
        experienceLevel,
        jobDescription,
        status: 'ANALYZING',
        currentStep: 2,
        atsScore: 0,
        keywordMatch: 0,
        skillMatch: 0,
        contentQuality: 0,
        readability: 0,
        formattingScore: 0,
        strengths: [],
        weaknesses: [],
        analysisDetails: Prisma.DbNull,
        editedContent: null,
      },
    });

    setImmediate(() => {
      void runAnalysisJob(analysis.id, input);
    });

    return { analysisId: analysis.id, status: 'ANALYZING' };
  },

  async getAnalysis(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    let analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      include: {
        keywords: { orderBy: { id: 'asc' } },
        suggestions: { orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fresh uploads have no analysis yet — return null (200) instead of noisy 404s.
    if (!analysis) return null;

    // Dev hot-reload / hung AI can leave status stuck on ANALYZING.
    if (analysis.status === 'ANALYZING') {
      const ageMs = Date.now() - new Date(analysis.updatedAt).getTime();
      const staleAfterMs = Number(process.env.AI_RESUME_ANALYSIS_STALE_MS || 4 * 60 * 1000);
      if (Number.isFinite(staleAfterMs) && ageMs > staleAfterMs) {
        analysis = await prisma.resumeAnalysis.update({
          where: { id: analysis.id },
          data: {
            status: 'FAILED',
            weaknesses: [
              'Analysis timed out or was interrupted. Please click Analyze again (OpenRouter → fallback models).',
            ],
          },
          include: {
            keywords: { orderBy: { id: 'asc' } },
            suggestions: { orderBy: { id: 'asc' } },
          },
        });
      }
    }

    return shapeAnalysisResponse(analysis);
  },

  async updateStep(resumeId: string, step: number, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    // Step tracking only applies after analyze has created a row.
    if (!analysis) return null;

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { currentStep: step },
    });
  },

  async getKeywords(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const details = parseAnalysisDetails(analysis.analysisDetails);
    const reasons = details?.missingKeywordReasons ?? {};

    const keywords = await prisma.resumeKeyword.findMany({
      where: { analysisId: analysis.id },
      orderBy: { id: 'asc' },
    });

    const withReasons = keywords.map((keyword) => ({
      ...keyword,
      reason: reasons[keyword.term],
    }));

    return {
      missing: withReasons.filter((keyword) => keyword.status === 'MISSING'),
      matched: withReasons.filter((keyword) => keyword.status === 'MATCHED'),
      partial: withReasons.filter((keyword) => keyword.status === 'PARTIAL'),
    };
  },

  async getSuggestions(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) return [];

    return prisma.resumeSuggestion.findMany({
      where: { analysisId: analysis.id },
      orderBy: [{ impact: 'asc' }, { id: 'asc' }],
    });
  },

  async applySuggestion(
    resumeId: string,
    suggestionId: number,
    userId: string,
    options?: { preserveContent?: boolean },
  ) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const suggestion = await prisma.resumeSuggestion.findFirst({
      where: { id: suggestionId, analysisId: analysis.id },
    });
    if (!suggestion) throw new AppError('Suggestion not found', 404);

    // Client Optimize already applied the draft — only mark status when preserveContent.
    if (!options?.preserveContent) {
      let nextContent = analysis.editedContent ?? '';
      const original = suggestion.originalText?.trim() ?? '';
      const suggested = suggestion.suggestedText?.trim() ?? '';

      if (suggested) {
        const fuzzy = original ? replaceTextFuzzy(nextContent, original, suggested) : null;
        if (fuzzy != null) {
          nextContent = fuzzy;
        } else if (original && nextContent.includes(original)) {
          nextContent = nextContent.replace(original, suggested);
        } else if (/^skills$/i.test(suggestion.category) && /skills/i.test(nextContent)) {
          // Merge skills into an existing Skills section when original excerpt drifted.
          nextContent = nextContent.replace(
            /(skills|technologies|tech\s+stack)\s*:?\s*\n?([^\n]*)/i,
            (_match, header: string) => `${header}\n${suggested}`,
          );
        } else if (nextContent.trim()) {
          const sectionHeader = suggestion.category
            ? `\n\n${suggestion.category.toUpperCase()}\n`
            : '\n\n';
          if (nextContent.toLowerCase().includes(suggestion.category.toLowerCase())) {
            nextContent = `${nextContent.trim()}\n${suggested}`;
          } else {
            nextContent = `${nextContent.trim()}${sectionHeader}${suggested}`;
          }
        } else {
          nextContent = suggested;
        }

        await prisma.resumeAnalysis.update({
          where: { id: analysis.id },
          data: { editedContent: nextContent },
        });
      }
    }

    return prisma.resumeSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'APPLIED' },
    });
  },

  async ignoreSuggestion(resumeId: string, suggestionId: number, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const suggestion = await prisma.resumeSuggestion.findFirst({
      where: { id: suggestionId, analysisId: analysis.id },
    });
    if (!suggestion) throw new AppError('Suggestion not found', 404);

    return prisma.resumeSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'IGNORED' },
    });
  },

  async updateContent(resumeId: string, content: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { editedContent: content },
    });
  },

  async recheckAts(resumeId: string, userId: string): Promise<RecheckResult> {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      include: {
        suggestions: true,
        keywords: { orderBy: { id: 'asc' } },
      },
    });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const details = parseAnalysisDetails(analysis.analysisDetails);
    const applied = analysis.suggestions.filter((item) => item.status === 'APPLIED');

    // Baseline = original analysis score (never a previous inflated recheck).
    const previousScore =
      details?.baselineAtsScore != null
        ? clampScore(details.baselineAtsScore)
        : clampScore(analysis.atsScore);

    const content = (analysis.editedContent ?? '').trim() || (await getResumeText(resumeId));

    const scored = scoreEditedResume({
      content,
      baselineAtsScore: previousScore,
      jobDescription: analysis.jobDescription,
      targetRole: analysis.targetRole,
      keywords: analysis.keywords,
      skillAnalysis: details?.skillAnalysis ?? EMPTY_SKILL_ANALYSIS,
      appliedSuggestions: applied,
    });

    const newScore = scored.atsScore;
    const improvement = newScore - previousScore;

    // Refresh matched/missing skills from current content against the JD skill pool.
    const priorSkills = details?.skillAnalysis ?? EMPTY_SKILL_ANALYSIS;
    const jdExtracted = normalizeProfessionalSkills(
      extractProfessionalSkillsFromText(
        [analysis.jobDescription ?? '', analysis.targetRole ?? ''].join('\n'),
      ),
    );
    const skillPool = normalizeProfessionalSkills(
      uniqSkills([
        ...priorSkills.matchedSkills,
        ...priorSkills.missingSkills,
        ...priorSkills.recommendedSkills,
        ...jdExtracted,
      ]),
    );
    const refreshedSkillAnalysis: SkillAnalysis = {
      matchedSkills: skillPool.filter((skill) => skillAppearsIn(content, skill)),
      missingSkills: skillPool.filter((skill) => !skillAppearsIn(content, skill)),
      transferableSkills: normalizeProfessionalSkills(priorSkills.transferableSkills),
      recommendedSkills: skillPool.filter((skill) => !skillAppearsIn(content, skill)),
    };

    const nextDetails: AnalysisDetails = {
      ...(details ?? {
        formattingScore: scored.formattingScore,
        skillAnalysis: EMPTY_SKILL_ANALYSIS,
        sectionScores: scored.sectionScores,
        atsIssues: [],
        optimizedSections: {
          professionalSummary: '',
          skills: [],
          experienceBullets: [],
          projectBullets: [],
        },
        optimizedResumeText: '',
        missingKeywordReasons: {},
      }),
      formattingScore: scored.formattingScore,
      sectionScores: scored.sectionScores,
      skillAnalysis: refreshedSkillAnalysis,
      baselineAtsScore: previousScore,
    };

    await prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: {
        atsScore: newScore,
        keywordMatch: scored.keywordMatch,
        skillMatch: scored.skillMatch,
        contentQuality: scored.contentQuality,
        readability: scored.readability,
        formattingScore: scored.formattingScore,
        analysisDetails: nextDetails as unknown as Prisma.InputJsonValue,
        // Do not force currentStep — recheck is also used after Apply on Optimize.
      },
    });

    // Reflect recovered keywords in stored status for the UI.
    const missingStill = analysis.keywords.filter((item) => item.status === 'MISSING');
    for (const keyword of missingStill) {
      if (!termAppearsIn(content, keyword.term)) continue;
      await prisma.resumeKeyword.update({
        where: { id: keyword.id },
        data: { status: 'MATCHED' },
      });
    }

    return {
      atsScore: newScore,
      previousAtsScore: previousScore,
      improvement,
      grade: scoreLabel(newScore),
      keywordMatch: scored.keywordMatch,
      skillMatch: scored.skillMatch,
      contentQuality: scored.contentQuality,
      readability: scored.readability,
      formattingScore: scored.formattingScore,
      sectionScores: scored.sectionScores,
      skillAnalysis: refreshedSkillAnalysis,
    };
  },

  async saveVersion(resumeId: string, label: string, userId: string, contentOverride?: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      include: { resume: { select: { originalName: true } } },
    });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const content =
      contentOverride?.trim() ||
      analysis.editedContent ||
      `Resume optimized for: ${analysis.targetRole}\nATS Score: ${analysis.atsScore}`;

    return prisma.resumeVersion.create({
      data: {
        analysisId: analysis.id,
        label,
        content,
        atsScore: analysis.atsScore,
        targetRole: analysis.targetRole,
        jobDescription: analysis.jobDescription,
        resumeFileName: analysis.resume.originalName,
      },
    });
  },

  async getVersions(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) return [];

    const versions = await prisma.resumeVersion.findMany({
      where: { analysisId: analysis.id },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((version) => ({
      ...version,
      targetRole: version.targetRole ?? analysis.targetRole,
      jobDescription: version.jobDescription ?? analysis.jobDescription,
      resumeId,
    }));
  },

  async listSavedVersions(userId: string) {
    const versions = await prisma.resumeVersion.findMany({
      where: { analysis: { resume: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: {
          select: {
            resumeId: true,
            targetRole: true,
            jobDescription: true,
            resume: { select: { originalName: true } },
          },
        },
      },
    });

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      content: version.content,
      atsScore: version.atsScore,
      createdAt: version.createdAt,
      targetRole: version.targetRole ?? version.analysis.targetRole,
      jobDescription: version.jobDescription ?? version.analysis.jobDescription,
      resumeFileName: version.resumeFileName ?? version.analysis.resume.originalName,
      resumeId: version.analysis.resumeId,
    }));
  },

  async getSavedVersion(versionId: number, userId: string) {
    await assertOwnedVersion(versionId, userId);

    const version = await prisma.resumeVersion.findUnique({
      where: { id: versionId },
      include: {
        analysis: {
          select: {
            resumeId: true,
            targetRole: true,
            jobDescription: true,
            resume: { select: { originalName: true } },
          },
        },
      },
    });
    if (!version) throw new AppError('Saved resume version not found', 404);

    return {
      id: version.id,
      label: version.label,
      content: version.content,
      atsScore: version.atsScore,
      createdAt: version.createdAt,
      targetRole: version.targetRole ?? version.analysis.targetRole,
      jobDescription: version.jobDescription ?? version.analysis.jobDescription,
      resumeFileName: version.resumeFileName ?? version.analysis.resume.originalName,
      resumeId: version.analysis.resumeId,
    };
  },

  async deleteSavedVersion(versionId: number, userId: string) {
    await assertOwnedVersion(versionId, userId);

    await prisma.resumeVersion.delete({ where: { id: versionId } });
    return { id: versionId };
  },

  async exportResume(
    resumeId: string,
    format: 'pdf' | 'docx' | 'txt',
    userId: string,
  ): Promise<ExportResult> {
    const resume = await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      include: { keywords: true },
    });

    const resumeText = await getResumeText(resumeId);
    const baseName = resume.originalName.replace(/\.[^.]+$/, '');
    const content = buildExportContent({
      baseName,
      targetRole: analysis?.targetRole,
      atsScore: analysis?.atsScore,
      content: analysis?.editedContent ?? resumeText,
    });

    if (format === 'txt') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'text/plain',
        fileName: `${baseName}_optimized.txt`,
      };
    }

    if (format === 'pdf') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'application/pdf',
        fileName: `${baseName}_optimized.pdf`,
      };
    }

    if (format === 'docx') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${baseName}_optimized.docx`,
      };
    }

    throw new AppError('Unsupported export format', 400);
  },
};
