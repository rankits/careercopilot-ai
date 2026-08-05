import { randomUUID } from 'node:crypto';

import { AppError } from '@/shared/utils/errors/AppError.js';
import { prisma } from '@/shared/config/db.conf.js';
import type {
  IApplicationPageAnalysisRepository,
  IJobPageAnalyzerService,
  IRequirementExtractor,
  ISecurePageFetcher,
} from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type { IAiRequirementExtractor } from '@/modules/auto-apply/services/ai-requirement-extractor.port.js';
import {
  APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
  APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
  APPLICATION_PAGE_EXTRACTOR_VERSION,
  type AnalyzeJobPageInput,
  type ApplicationPageAnalysisDto,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';
import {
  detectApplicationProvider,
  submissionCapabilityForProvider,
} from '@/modules/auto-apply/services/provider-detection.util.js';
import { buildAnalysisIdempotencyKey } from '@/modules/auto-apply/repositories/prisma-application-page-analysis.repository.js';
import { pickPrimaryApplyUrl } from '@/modules/job-listing/utils/safe-apply-url.js';

/** Requirements TTL (longer). Status/url freshness tracked separately. */
const REQUIREMENTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Job status / apply URL considered stale after this window. */
const STATUS_TTL_MS = 6 * 60 * 60 * 1000;

const inFlight = new Map<string, Promise<ApplicationPageAnalysisDto>>();

function isRequirementsFresh(analysis: ApplicationPageAnalysisDto, now: Date): boolean {
  const analyzedAt = analysis.freshness.requirementsAnalyzedAt
    ? new Date(analysis.freshness.requirementsAnalyzedAt)
    : new Date(analysis.analyzedAt);
  return (
    analyzedAt.getTime() + REQUIREMENTS_TTL_MS > now.getTime() && new Date(analysis.expiresAt) > now
  );
}

export class JobPageAnalyzerService implements IJobPageAnalyzerService {
  constructor(
    private readonly repository: IApplicationPageAnalysisRepository,
    private readonly fetcher: ISecurePageFetcher,
    private readonly deterministicExtractor: IRequirementExtractor,
    private readonly aiExtractor: IAiRequirementExtractor,
  ) {}

  async getLatest(jobId: string): Promise<ApplicationPageAnalysisDto | null> {
    return this.repository.findLatestByJobId(jobId);
  }

  async analyzeOrGetFresh(input: AnalyzeJobPageInput): Promise<ApplicationPageAnalysisDto> {
    const lockKey = input.jobId;
    const existingFlight = inFlight.get(lockKey);
    if (existingFlight && !input.forceRefresh) {
      return existingFlight;
    }

    const work = this.runAnalysis(input).finally(() => {
      if (inFlight.get(lockKey) === work) inFlight.delete(lockKey);
    });
    inFlight.set(lockKey, work);
    return work;
  }

  private async runAnalysis(input: AnalyzeJobPageInput): Promise<ApplicationPageAnalysisDto> {
    const now = new Date();
    if (!input.forceRefresh) {
      const latest = await this.repository.findLatestByJobId(input.jobId);
      if (latest && isRequirementsFresh(latest, now)) {
        return latest;
      }
    }

    const job = await prisma.job.findUnique({
      where: { id: input.jobId },
      include: { sources: { orderBy: { priority: 'desc' } } },
    });
    if (!job) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const applyUrl = pickPrimaryApplyUrl(job.sources);
    const pageUrl = applyUrl ?? `https://internal.invalid/jobs/${job.id}`;
    const provider = detectApplicationProvider(applyUrl ?? '');
    const capability = submissionCapabilityForProvider(provider);

    let sanitizedText = (job.descriptionText ?? '').trim();
    let contentHash = '';
    let httpStatus = 0;
    let finalUrl = pageUrl;
    let contentType: string | null = 'text/plain';
    let fetchedAt = now;
    let outcomeStatus: ApplicationPageAnalysisDto['outcomeStatus'] = 'JOB_PAGE_ANALYZED';
    let jobPageStatus: ApplicationPageAnalysisDto['jobPageStatus'] = 'PARTIAL';

    if (applyUrl) {
      try {
        const fetched = await this.fetcher.fetchPublicPage(applyUrl);
        if (fetched.sanitizedText.length > 80) {
          sanitizedText = fetched.sanitizedText;
        } else if (!sanitizedText) {
          sanitizedText = fetched.sanitizedText;
        }
        contentHash = fetched.contentHash;
        httpStatus = fetched.httpStatus;
        finalUrl = fetched.finalUrl;
        contentType = fetched.contentType;
        fetchedAt = fetched.fetchedAt;
        jobPageStatus =
          fetched.httpStatus >= 200 && fetched.httpStatus < 300 ? 'COMPLETE' : 'PARTIAL';
        outcomeStatus = 'JOB_PAGE_ANALYZED';
      } catch (error) {
        if (!sanitizedText) {
          throw error;
        }
        // Fall back to stored JD text — still extractable, form remains uninspected.
        jobPageStatus = 'PARTIAL';
        outcomeStatus = 'JOB_PAGE_ANALYZED';
        httpStatus = 0;
      }
    } else if (!sanitizedText) {
      throw new AppError(
        'No apply URL or job description available to analyze',
        422,
        'ANALYSIS_UNAVAILABLE',
      );
    }

    if (!contentHash) {
      const { createHash } = await import('node:crypto');
      contentHash = createHash('sha256').update(sanitizedText).digest('hex');
    }

    const deterministic = await this.deterministicExtractor.extract({
      sanitizedText,
      sourceUrl: finalUrl,
      provider,
    });

    // AI path is optional and must never override deterministic explicit facts for same code.
    let aiRequirements: typeof deterministic.requirements = [];
    try {
      aiRequirements = await this.aiExtractor.extract({
        sanitizedText,
        sourceUrl: finalUrl,
        provider,
      });
    } catch {
      aiRequirements = [];
    }

    const byCode = new Map(deterministic.requirements.map((item) => [item.code, item]));
    for (const aiItem of aiRequirements) {
      if (!byCode.has(aiItem.code)) {
        // Only accept weak/strong inference additions — never channel/authorization mutations.
        if (aiItem.code === 'SUBMISSION_CAPABILITY' || aiItem.code === 'PROVIDER') continue;
        byCode.set(aiItem.code, aiItem);
      }
    }
    const requirements = [...byCode.values()];

    const idempotencyKey = buildAnalysisIdempotencyKey({
      jobId: input.jobId,
      normalizedUrl: finalUrl.split('?')[0] ?? finalUrl,
      contentHash,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
    });

    const existingSame = await this.repository.findByIdempotencyKey(idempotencyKey);
    if (existingSame) {
      return existingSame;
    }

    const analyzedAt = fetchedAt;
    const expiresAt = new Date(analyzedAt.getTime() + REQUIREMENTS_TTL_MS);
    const statusCheckedAt = analyzedAt.toISOString();

    return this.repository.create({
      id: randomUUID(),
      jobId: input.jobId,
      jobApplicationId: input.jobApplicationId ?? null,
      schemaVersion: APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
      extractionPolicyVersion: APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
      provider,
      jobPageUrl: finalUrl,
      applicationUrl: applyUrl,
      jobPageStatus,
      formStatus: 'NOT_INSPECTED',
      submissionCapability: capability,
      outcomeStatus,
      requirements,
      fields: [],
      snapshot: {
        contentHash,
        sanitizedTextLength: sanitizedText.length,
        httpStatus,
        fetchedAt: analyzedAt.toISOString(),
        finalUrl,
        contentType: contentType ?? undefined,
      },
      freshness: {
        jobStatusCheckedAt: statusCheckedAt,
        applicationUrlCheckedAt: applyUrl ? statusCheckedAt : undefined,
        requirementsAnalyzedAt: statusCheckedAt,
        formInspectedAt: undefined,
      },
      idempotencyKey,
      analyzedAt: analyzedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sanitizedText,
    });
  }
}

export const __analysisTestables = { isRequirementsFresh, STATUS_TTL_MS, REQUIREMENTS_TTL_MS };
