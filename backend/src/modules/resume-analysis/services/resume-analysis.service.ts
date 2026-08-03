import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { resumeAnalysisAiClient } from '@/modules/resume-analysis/ai/resume-analysis-ai.client.js';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
import { clampScore, termAppearsIn } from '@/modules/resume-analysis/utils/text-match.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  AiAnalysisOutput,
  AnalysisDetails,
  AnalysisInput,
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
    select: { extractedText: true },
  });

  if (extraction?.extractedText) {
    return extraction.extractedText;
  }

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

  const parsedData = resume.parseRuns[0]?.parsedData;
  if (parsedData && typeof parsedData === 'object') {
    return JSON.stringify(parsedData, null, 2);
  }

  return `Resume file: ${resume.originalName}`;
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
    improvedSummary: aiResult.improvedSummary ?? aiResult.optimizedSections?.professionalSummary ?? '',
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

/** Guarantee at least a few Optimize-step suggestions when the model returns none. */
const ensureFallbackSuggestions = (
  analysisId: number,
  aiResult: AiAnalysisOutput,
  resumeText: string,
): ReturnType<typeof toSuggestionCreateInput>[] => {
  const fromAi = (aiResult.suggestions ?? []).map((suggestion) =>
    toSuggestionCreateInput(analysisId, suggestion),
  );
  if (fromAi.length > 0) return fromAi;

  const fallbacks: ReturnType<typeof toSuggestionCreateInput>[] = [];
  const missing = [
    ...(aiResult.skillAnalysis?.missingSkills ?? []),
    ...(aiResult.skillAnalysis?.recommendedSkills ?? []),
    ...(aiResult.missingSkills ?? []),
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 8);

  if (missing.length > 0) {
    const currentSkills = (aiResult.optimizedSections?.skills ?? []).join(', ');
    fallbacks.push(
      toSuggestionCreateInput(analysisId, {
        id: 'fallback-skills',
        title: `Add ${missing.slice(0, 3).join(', ')} to Skills`,
        category: 'skills',
        originalText: currentSkills,
        suggestedText: [...(aiResult.optimizedSections?.skills ?? []), ...missing]
          .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index)
          .join(', '),
        impact: 'HIGH',
        reason:
          'These skills are missing vs the JD. Applying updates your Skills section for better ATS match.',
      }),
    );
  }

  const improvedSummary =
    aiResult.optimizedSections?.professionalSummary?.trim() ||
    aiResult.improvedSummary?.trim() ||
    '';
  if (improvedSummary.length > 40) {
    const summaryMatch = resumeText.match(
      /(?:professional\s+)?summary[:\s]+([\s\S]{40,500}?)(?:\n\s*\n|work\s+experience|skills|education|projects)/i,
    );
    fallbacks.push(
      toSuggestionCreateInput(analysisId, {
        id: 'fallback-summary',
        title: 'Align profile summary to target role',
        category: 'summary',
        originalText: summaryMatch?.[1]?.trim() ?? '',
        suggestedText: improvedSummary,
        impact: 'HIGH',
        reason: 'Rewrite summary to better match the target role and JD keywords.',
      }),
    );
  }

  const expBullet = aiResult.optimizedSections?.experienceBullets?.[0];
  if (expBullet?.optimizedText) {
    fallbacks.push(
      toSuggestionCreateInput(analysisId, {
        id: 'fallback-experience',
        title: 'Strengthen an experience bullet',
        category: 'experience',
        originalText: expBullet.originalText || '',
        suggestedText: expBullet.optimizedText,
        impact: 'MEDIUM',
        reason: 'Clearer, ATS-friendly wording for a work experience bullet.',
      }),
    );
  }

  if (fallbacks.length === 0) {
    fallbacks.push(
      toSuggestionCreateInput(analysisId, {
        id: 'fallback-review-skills',
        title: 'Review Skills section for JD keywords',
        category: 'skills',
        originalText: '',
        suggestedText:
          (aiResult.optimizedSections?.skills ?? []).join(', ') ||
          'Add role-relevant skills from the job description',
        impact: 'MEDIUM',
        reason:
          'AI returned no rewrite suggestions. Open Skills and add missing JD keywords manually.',
      }),
    );
  }

  return fallbacks;
};

const scoreLabel = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

const runAnalysisJob = async (
  analysisId: number,
  input: AnalysisInput,
): Promise<void> => {
  const { resumeId, targetRole, experienceLevel, jobDescription } = input;

  try {
    logger.info({ resumeId, analysisId, targetRole }, 'Resume analysis job started');
    const resumeText = await getResumeText(resumeId);
    const aiResult = await resumeAnalysisAiClient.analyze(
      resumeText,
      targetRole,
      experienceLevel,
      jobDescription,
    );

    const analysisDetails = toAnalysisDetails(aiResult, clampScore(aiResult.atsScore));
    const optimizedText = (aiResult.optimizedResumeText ?? '').trim();
    // Prefer AI-cleaned structured resume so any upload shows in our format;
    // fall back to original extracted text when optimization is empty.
    const workingContent =
      optimizedText.length > 80 ? optimizedText : resumeText;

    await prisma.resumeKeyword.deleteMany({ where: { analysisId } });
    await prisma.resumeSuggestion.deleteMany({ where: { analysisId } });

    await prisma.resumeAnalysis.update({
      where: { id: analysisId },
      data: {
        atsScore: clampScore(aiResult.atsScore),
        keywordMatch: clampScore(aiResult.keywordMatch),
        skillMatch: clampScore(aiResult.skillMatch),
        contentQuality: clampScore(aiResult.contentQuality),
        readability: clampScore(aiResult.readability),
        formattingScore: clampScore(aiResult.formattingScore),
        strengths: aiResult.strengths ?? [],
        weaknesses: aiResult.weaknesses ?? [],
        analysisDetails: analysisDetails as unknown as Prisma.InputJsonValue,
        editedContent: workingContent,
        status: 'COMPLETED',
        currentStep: 3,
      },
    });

    const keywordData = [
      ...(aiResult.missingKeywords ?? []).map((keyword) =>
        toKeywordCreateInput(analysisId, keyword, 'MISSING'),
      ),
      ...(aiResult.matchedKeywords ?? []).map((keyword) =>
        toKeywordCreateInput(analysisId, keyword, 'MATCHED'),
      ),
    ];
    if (keywordData.length > 0) {
      await prisma.resumeKeyword.createMany({ data: keywordData });
    }

    const suggestionData = ensureFallbackSuggestions(analysisId, aiResult, resumeText);
    if (suggestionData.length > 0) {
      await prisma.resumeSuggestion.createMany({ data: suggestionData });
    }

    logger.info(
      { resumeId, analysisId, atsScore: clampScore(aiResult.atsScore) },
      'Resume analysis job completed',
    );
  } catch (err) {
    const failureReason = getErrorMessage(err);
    logger.error(
      { err, resumeId, analysisId, failureReason },
      'Resume analysis job failed',
    );
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
    failureReason:
      analysis.status === 'FAILED'
        ? (analysis.weaknesses?.[0] ?? 'Analysis failed')
        : undefined,
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
  async startAnalysis(input: AnalysisInput) {
    const { resumeId, targetRole, experienceLevel, jobDescription } = input;

    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new AppError('Resume not found', 404);

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

  async getAnalysis(resumeId: string) {
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

  async updateStep(resumeId: string, step: number) {
    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    // Step tracking only applies after analyze has created a row.
    if (!analysis) return null;

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { currentStep: step },
    });
  },

  async getKeywords(resumeId: string) {
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

  async getSuggestions(resumeId: string) {
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

  async applySuggestion(resumeId: string, suggestionId: number) {
    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const suggestion = await prisma.resumeSuggestion.findFirst({
      where: { id: suggestionId, analysisId: analysis.id },
    });
    if (!suggestion) throw new AppError('Suggestion not found', 404);

    let nextContent = analysis.editedContent ?? '';
    const original = suggestion.originalText?.trim() ?? '';
    const suggested = suggestion.suggestedText?.trim() ?? '';

    if (suggested) {
      if (original && nextContent.includes(original)) {
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

    return prisma.resumeSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'APPLIED' },
    });
  },

  async ignoreSuggestion(resumeId: string, suggestionId: number) {
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

  async updateContent(resumeId: string, content: string) {
    const analysis = await prisma.resumeAnalysis.findFirst({ where: { resumeId } });
    if (!analysis) throw new AppError('Analysis not found', 404);

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { editedContent: content },
    });
  },

  async recheckAts(resumeId: string): Promise<RecheckResult> {
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

    const content =
      (analysis.editedContent ?? '').trim() || (await getResumeText(resumeId));

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
        currentStep: 10,
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
    };
  },

  async saveVersion(
    resumeId: string,
    label: string,
    contentOverride?: string,
  ) {
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

  async getVersions(resumeId: string) {
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

  async listSavedVersions() {
    const versions = await prisma.resumeVersion.findMany({
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

  async getSavedVersion(versionId: number) {
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

  async exportResume(resumeId: string, format: 'pdf' | 'docx' | 'txt'): Promise<ExportResult> {
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      include: { keywords: true },
    });

    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new AppError('Resume not found', 404);

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
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${baseName}_optimized.docx`,
      };
    }

    throw new AppError('Unsupported export format', 400);
  },
};
