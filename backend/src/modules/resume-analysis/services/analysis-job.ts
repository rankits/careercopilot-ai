import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { resumeAnalysisAiClient } from '@/modules/resume-analysis/ai/resume-analysis-ai.client.js';
import { buildWorkingResumeContent } from '@/modules/resume-analysis/utils/merge-resume-content.js';
import { buildJdCoverageExtras } from '@/modules/resume-analysis/utils/suggestion-coverage.js';
import { clampScore } from '@/modules/resume-analysis/utils/text-match.js';
import type {
  AiAnalysisOutput,
  AnalysisDetails,
  AnalysisInput,
  AtsIssue,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';
import {
  EMPTY_SECTION_SCORES,
  EMPTY_SKILL_ANALYSIS,
  getResumeText,
} from '@/modules/resume-analysis/services/resume-analysis.shared.js';

type AiKeyword = AiAnalysisOutput['missingKeywords'][number];
type AiSuggestion = AiAnalysisOutput['suggestions'][number];

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

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

export const runAnalysisJob = async (analysisId: number, input: AnalysisInput): Promise<void> => {
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
