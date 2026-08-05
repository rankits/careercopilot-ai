import { ApplicationReadinessService } from '@/modules/auto-apply/services/application-readiness.service.js';
import { EnvFeatureFlagLookup } from '@/modules/auto-apply/adapters/env-feature-flag.lookup.js';
import { JobApplicationAdapterRegistry } from '@/modules/auto-apply/adapters/adapter-registry.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';
import { PrismaCandidateApplicationProfileRepository } from '@/modules/auto-apply/repositories/prisma-candidate-profile.repository.js';
import { PrismaApplicationAnswerRepository } from '@/modules/auto-apply/repositories/prisma-application-answer.repository.js';
import { PrismaApprovedResumeVersionRepository } from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { PrismaApplicationRuleRepository } from '@/modules/auto-apply/repositories/prisma-application-rule.repository.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaJobEligibilityLookup } from '@/modules/auto-apply/repositories/prisma-job-eligibility.lookup.js';
import { PrismaChannelDetectionJobLookup } from '@/modules/auto-apply/repositories/prisma-channel-detection.lookup.js';
import {
  PrismaMatchScoreLookup,
  PrismaTrackerDuplicateLookup,
  PrismaUserContactLookup,
} from '@/modules/auto-apply/repositories/prisma-readiness-lookups.repository.js';
import { ChannelDetectionService } from '@/modules/auto-apply/services/channel-detection.service.js';
import { eligibilityService } from '@/modules/auto-apply/controllers/eligibility.controller.js';
import { PrismaApplicationPageAnalysisRepository } from '@/modules/auto-apply/repositories/prisma-application-page-analysis.repository.js';
import { SecurePublicPageFetcher } from '@/modules/auto-apply/services/secure-page-fetcher.service.js';
import { DeterministicRequirementExtractor } from '@/modules/auto-apply/services/deterministic-requirement-extractor.service.js';
import { NoopAiRequirementExtractor } from '@/modules/auto-apply/services/ai-requirement-extractor.port.js';
import { createAiRequirementExtractor } from '@/modules/auto-apply/services/ai-requirement-extractor.service.js';
import { createHeadlessPageSnapshot } from '@/modules/auto-apply/services/headless-page-snapshot.service.js';
import { JobPageAnalyzerService } from '@/modules/auto-apply/services/job-page-analyzer.service.js';
import { RecommendationsMatchAdapter } from '@/modules/auto-apply/adapters/recommendations-match.adapter.js';
import { PrepareApplicationService } from '@/modules/auto-apply/services/prepare-application.service.js';

const channelJobLookup = new PrismaChannelDetectionJobLookup();
const analysisRepository = new PrismaApplicationPageAnalysisRepository();
const matchScoreLookup = new PrismaMatchScoreLookup();
const consentRepository = new PrismaApplicationConsentRepository();
const resumeVersionRepository = new PrismaApprovedResumeVersionRepository();
const jobApplicationRepository = new PrismaJobApplicationRepository();

export const readinessAdapterRegistry = new JobApplicationAdapterRegistry();
readinessAdapterRegistry.register(new ExternalRedirectAdapter());

export const applicationReadinessService = new ApplicationReadinessService(
  new EnvFeatureFlagLookup(),
  new PrismaJobEligibilityLookup(),
  channelJobLookup,
  new ChannelDetectionService(channelJobLookup),
  readinessAdapterRegistry,
  new PrismaCandidateApplicationProfileRepository(),
  new PrismaApplicationAnswerRepository(),
  resumeVersionRepository,
  new PrismaApplicationRuleRepository(),
  consentRepository,
  jobApplicationRepository,
  new PrismaUserContactLookup(),
  matchScoreLookup,
  new PrismaTrackerDuplicateLookup(),
  eligibilityService,
  analysisRepository,
);

/** OpenRouter when configured; otherwise deterministic-only (Noop). */
const aiRequirementExtractor = createAiRequirementExtractor();
const headlessSnapshot = createHeadlessPageSnapshot();

export const jobPageAnalyzerService = new JobPageAnalyzerService(
  analysisRepository,
  new SecurePublicPageFetcher(),
  new DeterministicRequirementExtractor(),
  aiRequirementExtractor,
  headlessSnapshot,
);

// Keep Noop export available for tests that import wiring helpers.
export { NoopAiRequirementExtractor };

export const applicationMatchPort = new RecommendationsMatchAdapter(
  matchScoreLookup,
  consentRepository,
  resumeVersionRepository,
);

export const prepareApplicationService = new PrepareApplicationService(
  jobPageAnalyzerService,
  applicationMatchPort,
  applicationReadinessService,
  jobApplicationRepository,
);
