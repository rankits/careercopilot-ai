import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
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
} from '@/modules/resumes/utils/skill-normalizer.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  AnalysisDetails,
  AnalysisInput,
  RecheckResult,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';
import { enqueueAnalysisJob } from '@/modules/resume-analysis/services/enqueue-analysis-job.js';
import { exportService } from '@/modules/resume-analysis/services/export.service.js';
import {
  EMPTY_SKILL_ANALYSIS,
  assertOwnedResume,
  getResumeText,
  ownedAnalysisWhere,
  parseAnalysisDetails,
  scoreLabel,
  shapeAnalysisResponse,
} from '@/modules/resume-analysis/services/resume-analysis.shared.js';
import { versionService } from '@/modules/resume-analysis/services/version.service.js';
import { resumeAnalysisConfig } from '@/modules/resume-analysis/config/resume-analysis.config.js';

export { runAnalysisJob } from '@/modules/resume-analysis/services/analysis-job.js';

export const resumeAnalysisService = {
  async startAnalysis(input: AnalysisInput) {
    const { resumeId, userId, targetRole, experienceLevel, jobDescription } = input;

    await assertOwnedResume(resumeId, userId);

    const existingAnalysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
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

    await enqueueAnalysisJob(analysis.id, input);

    return { analysisId: analysis.id, status: 'ANALYZING' };
  },

  async getAnalysis(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);

    let analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
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
      const staleAfterMs = resumeAnalysisConfig.staleAfterMs;
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

  async updateStep(resumeId: string, userId: string, step: number) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
    // Step tracking only applies after analyze has created a row.
    if (!analysis) return null;

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { currentStep: step },
    });
  },

  async getKeywords(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
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
      where: ownedAnalysisWhere(resumeId, userId),
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
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
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

  async ignoreSuggestion(resumeId: string, userId: string, suggestionId: number) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
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

  async updateContent(resumeId: string, userId: string, content: string) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
    if (!analysis) throw new AppError('Analysis not found', 404);

    return prisma.resumeAnalysis.update({
      where: { id: analysis.id },
      data: { editedContent: content },
    });
  },

  async recheckAts(resumeId: string, userId: string): Promise<RecheckResult> {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
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
      (analysis.editedContent ?? '').trim() || (await getResumeText(resumeId, userId));

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

  saveVersion: versionService.saveVersion,
  getVersions: versionService.getVersions,
  listSavedVersions: versionService.listSavedVersions,
  getSavedVersion: versionService.getSavedVersion,
  deleteSavedVersion: versionService.deleteSavedVersion,

  exportResume: exportService.exportResume,
};
