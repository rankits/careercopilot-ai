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

const channelJobLookup = new PrismaChannelDetectionJobLookup();

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
  new PrismaApprovedResumeVersionRepository(),
  new PrismaApplicationRuleRepository(),
  new PrismaApplicationConsentRepository(),
  new PrismaJobApplicationRepository(),
  new PrismaUserContactLookup(),
  new PrismaMatchScoreLookup(),
  new PrismaTrackerDuplicateLookup(),
  eligibilityService,
);
