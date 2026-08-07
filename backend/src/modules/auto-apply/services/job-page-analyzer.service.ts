import { randomUUID } from 'node:crypto';

import { AppError } from '@/shared/utils/errors/AppError.js';
import { prisma } from '@/shared/config/db.conf.js';
import type {
  IApplicationPageAnalysisRepository,
  IHeadlessPageSnapshot,
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
import {
  recordAnalysisCompleted,
  recordAnalysisFetch,
} from '@/modules/auto-apply/observability/analysis.metrics.js';
import {
  NoopHeadlessPageSnapshot,
  shouldAttemptHeadlessSnapshot,
} from '@/modules/auto-apply/services/headless-page-snapshot.service.js';
import {
  buildJobListingCorpus,
  mergeAnalysisCorpus,
} from '@/modules/auto-apply/utils/merge-analysis-corpus.util.js';

/** Requirements TTL (longer). Status/url freshness tracked separately. */
const REQUIREMENTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Job status / apply URL considered stale after this window. */
const STATUS_TTL_MS = 6 * 60 * 60 * 1000;

const inFlight = new Map<string, Promise<ApplicationPageAnalysisDto>>();

function isRequirementsFresh(analysis: ApplicationPageAnalysisDto, now: Date): boolean {
  if (
    analysis.extractorVersion !== APPLICATION_PAGE_EXTRACTOR_VERSION ||
    analysis.extractionPolicyVersion !== APPLICATION_PAGE_EXTRACTION_POLICY_VERSION ||
    analysis.schemaVersion !== APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION
  ) {
    return false;
  }
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
    private readonly headlessSnapshot: IHeadlessPageSnapshot = new NoopHeadlessPageSnapshot(),
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

    let previousAnalysisId: string | undefined;
    if (input.forceRefresh) {
      const latest = await this.repository.findLatestByJobId(input.jobId);
      if (latest) {
        previousAnalysisId = latest.id;
      }
    }

    const work = this.runAnalysis({ ...input, previousAnalysisId }).finally(() => {
      if (inFlight.get(lockKey) === work) inFlight.delete(lockKey);
    });
    inFlight.set(lockKey, work);
    return work;
  }

  private async runAnalysis(
    input: AnalyzeJobPageInput & { previousAnalysisId?: string },
  ): Promise<ApplicationPageAnalysisDto> {
    const started = Date.now();
    const now = new Date();
    if (!input.forceRefresh) {
      const latest = await this.repository.findLatestByJobId(input.jobId);
      if (latest && isRequirementsFresh(latest, now)) {
        recordAnalysisCompleted({
          durationMs: Date.now() - started,
          provider: latest.provider,
          requirementCount: latest.requirements.length,
          reviewRequiredCount: latest.requirements.filter(
            (r) => r.reviewStatus === 'REVIEW_REQUIRED',
          ).length,
          fromCache: true,
        });
        return latest;
      }
    }

    const job = await prisma.job.findUnique({
      where: { id: input.jobId },
      include: {
        sources: { orderBy: { priority: 'desc' } },
        company: { select: { name: true, slug: true } },
      },
    });
    if (!job) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const applyUrl = pickPrimaryApplyUrl(job.sources);
    const pageUrl = applyUrl ?? `https://internal.invalid/jobs/${job.id}`;
    const provider = detectApplicationProvider(applyUrl ?? '');
    const capability = submissionCapabilityForProvider(provider);

    // Always start from stored job listing data (title/company/skills/JD). Page
    // explore and headless snapshots are merged in — never used alone when they
    // would wipe a substantial listing (Ashby application forms are a common case).
    const listingCorpus = buildJobListingCorpus({
      title: job.title,
      companyName: job.company?.name,
      companySlug: job.companySlug,
      employmentType: job.employmentType,
      remoteType: job.remoteType,
      descriptionText: job.descriptionText,
      skills: job.skills,
      tags: job.tags,
    });

    let pageExploredText = '';
    let contentHash = '';
    let httpStatus = 0;
    let finalUrl = pageUrl;
    let contentType: string | null = 'text/plain';
    let fetchedAt = now;
    let outcomeStatus: ApplicationPageAnalysisDto['outcomeStatus'] = 'JOB_PAGE_ANALYZED';
    let jobPageStatus: ApplicationPageAnalysisDto['jobPageStatus'] = 'PARTIAL';

    if (applyUrl) {
      const fetchStarted = Date.now();
      let httpSanitizedLength = 0;
      try {
        const fetched = await this.fetcher.fetchPublicPage(applyUrl);
        httpSanitizedLength = fetched.sanitizedText.length;
        pageExploredText = fetched.sanitizedText.trim();
        contentHash = fetched.contentHash;
        httpStatus = fetched.httpStatus;
        finalUrl = fetched.finalUrl;
        contentType = fetched.contentType;
        fetchedAt = fetched.fetchedAt;
        jobPageStatus =
          fetched.httpStatus >= 200 && fetched.httpStatus < 300 ? 'COMPLETE' : 'PARTIAL';
        outcomeStatus = 'JOB_PAGE_ANALYZED';
        recordAnalysisFetch({
          success: true,
          provider,
          durationMs: Date.now() - fetchStarted,
        });
      } catch (error) {
        recordAnalysisFetch({
          success: false,
          provider,
          durationMs: Date.now() - fetchStarted,
        });
        if (!listingCorpus) {
          throw error;
        }
        // Fall back to stored job listing — still extractable, form remains uninspected.
        jobPageStatus = 'PARTIAL';
        outcomeStatus = 'JOB_PAGE_ANALYZED';
        httpStatus = 0;
      }

      // Controlled Chromium snapshot for JS-heavy / thin HTTP shells (not AI URL explore).
      if (
        shouldAttemptHeadlessSnapshot({
          enabled: this.headlessSnapshot.enabled,
          applyUrl,
          provider,
          httpSanitizedLength,
        })
      ) {
        const snap = await this.headlessSnapshot.snapshot(applyUrl);
        if (snap && snap.sanitizedText.trim().length > pageExploredText.length) {
          pageExploredText = snap.sanitizedText.trim();
          contentHash = snap.contentHash;
          httpStatus = snap.httpStatus || httpStatus;
          finalUrl = snap.finalUrl;
          contentType = snap.contentType;
          fetchedAt = snap.fetchedAt;
          jobPageStatus =
            snap.httpStatus >= 200 && snap.httpStatus < 300 ? 'COMPLETE' : jobPageStatus;
        }
      }
    } else if (!listingCorpus) {
      throw new AppError(
        'No apply URL or job description available to analyze',
        422,
        'ANALYSIS_UNAVAILABLE',
      );
    }

    const sanitizedText = mergeAnalysisCorpus({
      listingText: listingCorpus,
      pageText: pageExploredText,
    });

    if (!sanitizedText) {
      throw new AppError(
        'No apply URL or job description available to analyze',
        422,
        'ANALYSIS_UNAVAILABLE',
      );
    }

    // Hash the merged corpus so cache invalidates when either listing or page changes.
    {
      const { createHash } = await import('node:crypto');
      contentHash = createHash('sha256').update(sanitizedText).digest('hex');
    }

    const deterministic = await this.deterministicExtractor.extract({
      sanitizedText,
      sourceUrl: finalUrl,
      provider,
    });

    // AI path is optional and must never override deterministic explicit facts for same code.
    // AI receives sanitized text only — never a live URL to browse.
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
        if (aiItem.code === 'SUBMISSION_CAPABILITY' || aiItem.code === 'PROVIDER') continue;
        byCode.set(aiItem.code, aiItem);
      }
    }
    const requirements = [...byCode.values()];

    if (requirements.length === 0 && sanitizedText.length > 400) {
      const { logger } = await import('@/shared/logger/logger.js');
      logger.warn(
        {
          metric: 'auto_apply.analysis.empty_requirements',
          jobId: input.jobId,
          provider,
          sanitizedTextLength: sanitizedText.length,
          deterministicCount: deterministic.requirements.length,
          aiCount: aiRequirements.length,
        },
        'Page analysis produced no requirements from substantial text',
      );
    }
    const idempotencyKey = buildAnalysisIdempotencyKey({
      jobId: input.jobId,
      normalizedUrl: finalUrl.split('?')[0] ?? finalUrl,
      contentHash,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
    });

    const existingSame = await this.repository.findByIdempotencyKey(idempotencyKey);
    if (existingSame) {
      recordAnalysisCompleted({
        durationMs: Date.now() - started,
        provider,
        requirementCount: existingSame.requirements.length,
        reviewRequiredCount: existingSame.requirements.filter(
          (r) => r.reviewStatus === 'REVIEW_REQUIRED',
        ).length,
        fromCache: true,
      });
      return existingSame;
    }

    const analyzedAt = fetchedAt;
    const expiresAt = new Date(analyzedAt.getTime() + REQUIREMENTS_TTL_MS);
    const statusCheckedAt = analyzedAt.toISOString();

    const created = await this.repository.create({
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

    recordAnalysisCompleted({
      durationMs: Date.now() - started,
      provider,
      requirementCount: requirements.length,
      reviewRequiredCount: requirements.filter((r) => r.reviewStatus === 'REVIEW_REQUIRED').length,
      fromCache: false,
    });

    if (input.previousAnalysisId) {
      created.previousAnalysisId = input.previousAnalysisId;
    }

    return created;
  }
}

export const __analysisTestables = { isRequirementsFresh, STATUS_TTL_MS, REQUIREMENTS_TTL_MS };
