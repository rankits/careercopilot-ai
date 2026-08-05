import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';

export type ResumeAnalysisConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ResumeAnalysisResult {
  strengths: string[];
  concerns: string[];
  missingEvidence: string[];
  unknowns: string[];
  confidence: ResumeAnalysisConfidence;
  analyzedAt: string;
  degraded?: boolean;
  cached?: boolean;
}

function contentHash(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Deterministic resume-vs-job comparison (AA-061).
 * Uses job analysis requirements + resume label/tags/category — never blocks Continue.
 * AI provider failures are not applicable; analysis failures degrade to empty advisory.
 */
export class ResumeAnalysisService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly resumeVersions: IApprovedResumeVersionRepository,
    private readonly consents: IApplicationConsentRepository,
    private readonly analysisRepository: IApplicationPageAnalysisRepository,
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
      return this.degradedResult();
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
      const pageAnalysis = await this.analysisRepository.findLatestByJobId(application.jobId);
      const requirementBlob = JSON.stringify(pageAnalysis?.requirements ?? []);
      const resumeBlob = [version.label, version.category, ...(version.tags ?? [])].join('|');
      const hash = contentHash([
        application.resumeVersionId,
        application.jobId,
        requirementBlob,
        resumeBlob,
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
          return { ...result, cached: true };
        }
      }

      const result = this.compare(version, pageAnalysis?.requirements ?? []);
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
      return this.degradedResult();
    }
  }

  private compare(
    version: { label: string; category: string; tags: string[] },
    requirements: Array<{
      code?: string;
      assertion?: string;
      sourceText?: string;
      required?: boolean;
    }>,
  ): ResumeAnalysisResult {
    const resumeText = [version.label, version.category, ...version.tags].join(' ');
    const resumeTokens = new Set(tokenize(resumeText));

    const strengths: string[] = [];
    const concerns: string[] = [];
    const missingEvidence: string[] = [];
    const unknowns: string[] = [];

    if (requirements.length === 0) {
      unknowns.push('Job requirements are not available yet — analysis confidence is limited.');
    }

    for (const req of requirements) {
      const haystack = [req.code, req.assertion, req.sourceText].filter(Boolean).join(' ');
      const tokens = tokenize(haystack);
      if (tokens.length === 0) {
        unknowns.push(`Could not interpret requirement ${req.code ?? 'unknown'}.`);
        continue;
      }
      const overlap = tokens.filter((t) => resumeTokens.has(t));
      const label = (req.code ?? 'Requirement').replace(/_/g, ' ');
      if (overlap.length >= Math.max(1, Math.ceil(tokens.length * 0.35))) {
        strengths.push(
          `Your resume (${version.label}) appears to align with “${label}” based on overlapping terms.`,
        );
      } else if (req.required !== false) {
        if (overlap.length === 0) {
          concerns.push(
            `This posting mentions “${label}”, which is not clearly reflected in your selected resume.`,
          );
        } else {
          missingEvidence.push(
            `Not clear whether “${label}” is fully covered — only partial overlap with your resume.`,
          );
        }
      } else {
        missingEvidence.push(`Optional signal “${label}” is not clearly evidenced on your resume.`);
      }
    }

    let confidence: ResumeAnalysisConfidence = 'MEDIUM';
    if (requirements.length === 0 || (strengths.length === 0 && concerns.length === 0)) {
      confidence = 'LOW';
    } else if (strengths.length >= concerns.length && missingEvidence.length <= 1) {
      confidence = 'HIGH';
    } else if (concerns.length > strengths.length + 1) {
      confidence = 'LOW';
    }

    return {
      strengths,
      concerns,
      missingEvidence,
      unknowns,
      confidence,
      analyzedAt: new Date().toISOString(),
    };
  }

  private degradedResult(): ResumeAnalysisResult {
    return {
      strengths: [],
      concerns: [],
      missingEvidence: [],
      unknowns: [],
      confidence: 'LOW',
      analyzedAt: new Date().toISOString(),
      degraded: true,
    };
  }
}
