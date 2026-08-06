import { prisma } from '@/shared/config/db.conf.js';
import type { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import type { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import type {
  ProfileJobMatchRecord,
  ProfileJobMatchResult,
} from '@/modules/auto-apply/types/profile-job-match.types.js';
import type { IProfileJobMatchRepository } from '@/modules/auto-apply/repositories/prisma-profile-job-match.repository.js';
import {
  computeProfileJobMatch,
  computeProfileJobMatchContentHash,
} from '@/modules/auto-apply/utils/profile-job-match.util.js';

export interface EnsureProfileJobMatchInput {
  readonly userId: string;
  readonly jobId: string;
  readonly jobApplicationId: string;
  readonly analysis: ApplicationPageAnalysisDto | null;
  readonly recommendationScoreFallback?: number | null;
  readonly forceRefresh?: boolean;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

/**
 * Builds and persists an application-specific profile→job match.
 * Never loads resume content or resume parse payloads.
 */
export class ProfileJobMatchService {
  constructor(
    private readonly profiles: ICandidateApplicationProfileRepository,
    private readonly answers: IApplicationAnswerRepository,
    private readonly repository: IProfileJobMatchRepository,
  ) {}

  async getByJobApplicationId(
    userId: string,
    jobApplicationId: string,
  ): Promise<ProfileJobMatchRecord | null> {
    return this.repository.findByJobApplicationId(userId, jobApplicationId);
  }

  async ensureMatch(input: EnsureProfileJobMatchInput): Promise<ProfileJobMatchResult> {
    const job = await prisma.job.findUnique({
      where: { id: input.jobId },
      select: {
        id: true,
        title: true,
        companySlug: true,
        employmentType: true,
        remoteType: true,
        descriptionText: true,
        skills: true,
      },
    });
    if (!job) {
      // Soft: return empty-ish result rather than failing prepare.
      const empty = computeProfileJobMatch({
        job: {
          id: input.jobId,
          title: '',
          companySlug: '',
          skills: [],
        },
        analysis: input.analysis,
        candidate: { profile: null, answers: new Map() },
        recommendationScoreFallback: input.recommendationScoreFallback,
      });
      await this.repository.upsert({
        userId: input.userId,
        jobApplicationId: input.jobApplicationId,
        jobId: input.jobId,
        analysisId: input.analysis?.id ?? null,
        contentHash: computeProfileJobMatchContentHash({
          analysisId: input.analysis?.id ?? null,
          jobId: input.jobId,
          jobTitle: '',
          jobSkills: [],
          preferences: null,
          answers: {},
        }),
        result: empty,
      });
      return empty;
    }

    const [profile, answerRows] = await Promise.all([
      this.profiles.findByUserId(input.userId),
      this.answers.findManyByUserId(input.userId),
    ]);

    const answersMap = new Map(answerRows.map((row) => [row.questionKey, row.answer]));
    const answersRecord = Object.fromEntries(answersMap.entries());
    const jobSkills = asStringList(job.skills);

    const contentHash = computeProfileJobMatchContentHash({
      analysisId: input.analysis?.id ?? null,
      jobId: job.id,
      jobTitle: job.title,
      jobSkills,
      preferences: profile?.preferences ?? null,
      answers: answersRecord,
    });

    if (!input.forceRefresh) {
      const existing = await this.repository.findByJobApplicationId(
        input.userId,
        input.jobApplicationId,
      );
      if (existing && existing.contentHash === contentHash) {
        return existing.result;
      }
    }

    const result = computeProfileJobMatch({
      job: {
        id: job.id,
        title: job.title,
        companySlug: job.companySlug,
        employmentType: job.employmentType,
        remoteType: job.remoteType,
        descriptionText: job.descriptionText,
        skills: jobSkills,
      },
      analysis: input.analysis,
      candidate: { profile, answers: answersMap },
      recommendationScoreFallback: input.recommendationScoreFallback,
    });

    await this.repository.upsert({
      userId: input.userId,
      jobApplicationId: input.jobApplicationId,
      jobId: job.id,
      analysisId: input.analysis?.id ?? null,
      contentHash,
      result,
    });

    return result;
  }
}
