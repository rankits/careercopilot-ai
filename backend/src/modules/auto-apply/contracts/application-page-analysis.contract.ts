import type { ApplicationMatchSnapshot } from '@/modules/auto-apply/types/application-match.types.js';
import type { ApplicationReadinessResult } from '@/modules/auto-apply/types/application-readiness.types.js';
import type { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import type { ProfileJobMatchResult } from '@/modules/auto-apply/types/profile-job-match.types.js';
import type {
  AnalyzeJobPageInput,
  ApplicationPageAnalysisDto,
  PrepareApplicationInput,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

export interface IApplicationPageAnalysisRepository {
  findLatestByJobId(jobId: string): Promise<ApplicationPageAnalysisDto | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<ApplicationPageAnalysisDto | null>;
  create(
    data: Omit<ApplicationPageAnalysisDto, 'createdAt' | 'updatedAt'> & {
      sanitizedText?: string | null;
    },
  ): Promise<ApplicationPageAnalysisDto>;
}

export interface IJobPageAnalyzerService {
  analyzeOrGetFresh(input: AnalyzeJobPageInput): Promise<ApplicationPageAnalysisDto>;
  getLatest(jobId: string): Promise<ApplicationPageAnalysisDto | null>;
}

export interface ApplicationPackageStub {
  provider: string;
  submissionMode: 'EXTERNAL_MANUAL' | 'BROWSER_ASSISTED' | 'UNSUPPORTED';
  finalSubmissionRequiresUser: boolean;
  selectedResumeId?: string | null;
  analysisId: string;
  matchStatus?: ApplicationMatchSnapshot['status'];
  overallScore?: number | null;
  /** Application-specific profile match (authoritative for Fit). */
  profileMatch?: ProfileJobMatchResult | null;
  /** Cached recommendation score — historical/fallback only. */
  recommendationScoreFallback?: number | null;
}

export interface PrepareApplicationResult {
  analysis: ApplicationPageAnalysisDto;
  /** @deprecated Prefer profileMatch — recommendation cache snapshot. */
  match: ApplicationMatchSnapshot;
  profileMatch: ProfileJobMatchResult | null;
  readiness: ApplicationReadinessResult;
  package: ApplicationPackageStub;
  application?: JobApplicationDto | null;
}

export interface IPrepareApplicationService {
  prepare(input: PrepareApplicationInput): Promise<PrepareApplicationResult>;
}

export interface SecurePageFetchResult {
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  sanitizedText: string;
  contentHash: string;
  fetchedAt: Date;
  redirectCount: number;
}

export interface ISecurePageFetcher {
  fetchPublicPage(url: string): Promise<SecurePageFetchResult>;
}

export interface HeadlessPageSnapshotResult extends SecurePageFetchResult {
  renderMethod: 'HEADLESS_CHROMIUM';
}

/**
 * Optional Chromium snapshot for JS-rendered job boards.
 * Must enforce the same SSRF rules as ISecurePageFetcher.
 * Does not submit forms or persist cookies.
 */
export interface IHeadlessPageSnapshot {
  readonly enabled: boolean;
  snapshot(url: string): Promise<HeadlessPageSnapshotResult | null>;
}

export interface DeterministicExtractionInput {
  sanitizedText: string;
  sourceUrl: string;
  provider: string;
}

export interface IRequirementExtractor {
  extract(input: DeterministicExtractionInput): Promise<{
    requirements: import('@/modules/auto-apply/types/application-page-analysis.types.js').ExtractedRequirement[];
  }>;
}
