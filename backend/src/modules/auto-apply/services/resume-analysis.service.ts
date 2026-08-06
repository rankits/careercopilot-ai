import { createHash, randomUUID } from 'node:crypto';

import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type { IResumeContentResolver } from '@/modules/auto-apply/services/resume-content-resolver.service.js';
import {
  RESUME_JOB_ANALYZER_PROMPT_VERSION,
  RESUME_JOB_ANALYZER_SCHEMA_VERSION,
  RESUME_JOB_ANALYZER_VERSION,
  resumeJobAnalyzer,
  type ResumeJobAnalyzer,
  type ResumeJobAnalysisResult,
} from '@/modules/auto-apply/services/resume-job-analyzer.js';
import { REQUIREMENT_CLASSIFIER_VERSION } from '@/modules/auto-apply/utils/requirement-domain.util.js';
import { KEYWORD_EXTRACTOR_VERSION } from '@/modules/auto-apply/utils/resume-keyword-extract.util.js';

export type ResumeAnalysisConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Advisory resume analysis result. String lists remain FE-compatible. */
export interface ResumeAnalysisResult {
  strengths: string[];
  concerns: string[];
  missingEvidence: string[];
  unknowns: string[];
  confidence: ResumeAnalysisConfidence;
  analyzedAt: string;
  degraded?: boolean;
  cached?: boolean;
  status?: 'COMPLETE' | 'LIMITED' | 'FAILED';
  overallAlignment?: number | null;
  summary?: ResumeJobAnalysisResult['summary'];
  keywords?: {
    matched: string[];
    missing: string[];
    optional: string[];
  };
  excludedRequirements?: ResumeJobAnalysisResult['excludedRequirements'];
  warnings?: Array<{ code: string; message: string }>;
  resumeContentHash?: string;
  jobContentHash?: string;
  contentSource?: 'UPLOADED_EXTRACTION' | 'BUILDER_VERSION';
  schemaVersion?: number;
  analyzerVersion?: string;
}

function contentHash(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

/**
 * Application-scoped resume↔job analysis (AA-061).
 * Uses real resume body text; excludes eligibility-only requirements.
 * Advisory only: never blocks Continue / employer handoff.
 */
export class ResumeAnalysisService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly resumeVersions: IApprovedResumeVersionRepository,
    private readonly consents: IApplicationConsentRepository,
    private readonly analysisRepository: IApplicationPageAnalysisRepository,
    private readonly contentResolver: IResumeContentResolver,
    private readonly analyzer: ResumeJobAnalyzer = resumeJobAnalyzer,
  ) {}

  async analyze(
    userId: string,
    jobApplicationId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<ResumeAnalysisResult> {
    const consent = await this.consents.findActiveByType(userId, 'RESUME_USAGE');
    if (!consent) {
      throw new AppError(
        'Grant resume usage consent before analyzing a resume.',
        403,
        'CONSENT_REQUIRED',
      );
    }

    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    if (!application.jobId) {
      return this.degradedResult('FAILED');
    }
    if (!application.resumeVersionId) {
      throw new AppError(
        'Select a resume for this application before analyzing.',
        400,
        'RESUME_SELECTION_REQUIRED',
      );
    }

    const version = await this.resumeVersions.findById(userId, application.resumeVersionId);
    if (!version) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }

    try {
      const resolved = await this.contentResolver.resolve({
        userId,
        approvedResumeVersionId: application.resumeVersionId,
      });

      const pageAnalysis = await this.analysisRepository.findLatestByJobId(application.jobId);
      const requirements = pageAnalysis?.requirements ?? [];
      const requirementBlob = JSON.stringify(
        requirements.map((r) => ({
          code: r.code,
          assertion: r.assertion,
          sourceText: r.sourceText,
          required: r.required,
          importance: r.importance,
        })),
      );
      const jobContentHash = contentHash([
        application.jobId,
        pageAnalysis?.id ?? 'none',
        pageAnalysis?.analyzedAt ?? '',
        requirementBlob,
      ]);

      const hash = contentHash([
        jobApplicationId,
        application.resumeVersionId,
        resolved.contentHash,
        jobContentHash,
        String(RESUME_JOB_ANALYZER_SCHEMA_VERSION),
        RESUME_JOB_ANALYZER_VERSION,
        RESUME_JOB_ANALYZER_PROMPT_VERSION,
        REQUIREMENT_CLASSIFIER_VERSION,
        KEYWORD_EXTRACTOR_VERSION,
      ]);

      if (!options?.forceRefresh) {
        const cached = await prisma.jobApplicationResumeAnalysis.findUnique({
          where: {
            resumeVersionId_jobId_contentHash: {
              resumeVersionId: application.resumeVersionId,
              jobId: application.jobId,
              contentHash: hash,
            },
          },
        });
        if (cached) {
          const result = cached.result as ResumeAnalysisResult;
          const staleSchema =
            result.schemaVersion == null ||
            result.schemaVersion < RESUME_JOB_ANALYZER_SCHEMA_VERSION ||
            result.analyzerVersion !== RESUME_JOB_ANALYZER_VERSION;
          if (result.degraded || result.status === 'FAILED' || staleSchema) {
            // recompute
          } else {
            return {
              ...result,
              cached: true,
              resumeContentHash: resolved.contentHash,
              jobContentHash,
              contentSource: resolved.source,
            };
          }
        }
      }

      const job = await prisma.job.findFirst({
        where: { id: application.jobId },
        select: {
          title: true,
          descriptionText: true,
          company: { select: { name: true } },
        },
      });

      const jobAnalysisLimited =
        pageAnalysis?.outcomeStatus === 'LIMITED' ||
        pageAnalysis?.outcomeStatus === 'FAILED' ||
        (pageAnalysis as { status?: string } | null)?.status === 'LIMITED' ||
        (pageAnalysis as { status?: string } | null)?.status === 'FAILED';

      const analysis = this.analyzer.analyze({
        resumeText: resolved.text,
        jobTitle: job?.title ?? application.jobTitle ?? '',
        jobDescription: job?.descriptionText ?? '',
        jobAnalysisLimited,
        requirements: requirements.map((r) => ({
          code: r.code ?? 'REQUIREMENT',
          assertion: r.assertion,
          sourceText: r.sourceText,
          required: r.required,
          importance: r.importance,
          confidence: r.confidence,
          value: r.value,
        })),
      });

      const result: ResumeAnalysisResult = {
        strengths: analysis.strengths,
        concerns: analysis.concerns,
        missingEvidence: analysis.missingEvidence,
        unknowns: analysis.unknowns,
        confidence: analysis.confidence,
        analyzedAt: new Date().toISOString(),
        status: analysis.status,
        overallAlignment: analysis.overallAlignment,
        summary: analysis.summary,
        keywords: {
          matched: analysis.keywords.matched,
          missing: analysis.keywords.missing,
          optional: analysis.keywords.optional,
        },
        excludedRequirements: analysis.excludedRequirements,
        warnings: analysis.warnings,
        resumeContentHash: resolved.contentHash,
        jobContentHash,
        contentSource: resolved.source,
        schemaVersion: analysis.schemaVersion,
        analyzerVersion: analysis.analyzerVersion,
      };

      await prisma.jobApplicationResumeAnalysis.upsert({
        where: {
          resumeVersionId_jobId_contentHash: {
            resumeVersionId: application.resumeVersionId,
            jobId: application.jobId,
            contentHash: hash,
          },
        },
        create: {
          id: randomUUID(),
          userId,
          jobApplicationId,
          jobId: application.jobId,
          resumeVersionId: application.resumeVersionId,
          contentHash: hash,
          result,
          analyzedAt: new Date(result.analyzedAt),
        },
        update: {
          result,
          analyzedAt: new Date(result.analyzedAt),
          jobApplicationId,
        },
      });

      return { ...result, cached: false };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn(
        { err: error, jobApplicationId },
        'Resume analysis failed — returning degraded advisory result',
      );
      return this.degradedResult('FAILED');
    }
  }

  private degradedResult(status: 'LIMITED' | 'FAILED' = 'FAILED'): ResumeAnalysisResult {
    return {
      strengths: [],
      concerns: [],
      missingEvidence: [],
      unknowns: [],
      confidence: 'LOW',
      analyzedAt: new Date().toISOString(),
      degraded: true,
      status,
      overallAlignment: null,
      schemaVersion: RESUME_JOB_ANALYZER_SCHEMA_VERSION,
      analyzerVersion: RESUME_JOB_ANALYZER_VERSION,
    };
  }
}
