import { JobProviderRegistry } from '@/modules/jobs/registry/job-provider.registry.js';
import { DeduplicationEngine } from '@/modules/jobs/services/aggregation/deduplication.engine.js';
import { AggregationService } from '@/modules/jobs/services/aggregation/aggregation.service.js';
import { GreenhouseJobProvider } from '@/modules/jobs/providers/greenhouse/provider.js';
import { OpenPublicFeedProvider } from '@/modules/jobs/providers/public-feed/public-feed.provider.js';
import { RemotiveJobProvider } from '@/modules/jobs/providers/remotive/provider.js';
import { JobicyJobProvider } from '@/modules/jobs/providers/jobicy/provider.js';
import { HimalayasJobProvider } from '@/modules/jobs/providers/himalayas/provider.js';
import { RemoteJobsOrgProvider } from '@/modules/jobs/providers/remotejobs-org/provider.js';
import { JobsService } from '@/modules/jobs/services/jobs.service.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { jobsLogger } from '@/shared/utils/logger.js';

// 1. Initialize Registry
export const jobProviderRegistry = new JobProviderRegistry();

// 2. Instantiate and Register Providers
const defaultGreenhouseProvider = new GreenhouseJobProvider({
  boardToken: 'stripe',
  companyName: 'Stripe',
  tier: ProviderTier.PUBLIC,
  timeoutMs: 8000,
});

const defaultPublicFeedProvider = new OpenPublicFeedProvider();
const remotiveProvider = new RemotiveJobProvider({
  searches: ['software', 'India', 'engineer', 'developer'],
  tier: ProviderTier.PUBLIC,
});
const jobicyProvider = new JobicyJobProvider({
  feeds: [
    { count: 50, geo: 'apac' },
    { count: 50, geo: 'usa', industry: 'engineering' },
    { count: 30, tag: 'javascript' },
  ],
  tier: ProviderTier.PUBLIC,
});
const himalayasProvider = new HimalayasJobProvider({
  browse: { limit: 40, offset: 0 },
  searches: [
    { q: 'engineer', country: 'India' },
    { q: 'software', country: 'US' },
    { country: 'India' },
  ],
  tier: ProviderTier.PUBLIC,
});

jobProviderRegistry.register(defaultGreenhouseProvider);
jobProviderRegistry.register(defaultPublicFeedProvider);
jobProviderRegistry.register(remotiveProvider);
jobProviderRegistry.register(jobicyProvider);
const remoteJobsOrgProvider = new RemoteJobsOrgProvider({
  feeds: [{ category: 'programming', limit: 50 }, { category: 'design', limit: 30 }, { limit: 40 }],
  tier: ProviderTier.PUBLIC,
});

jobProviderRegistry.register(himalayasProvider);
jobProviderRegistry.register(remoteJobsOrgProvider);

jobsLogger.info(
  {
    providers: jobProviderRegistry.getAll().map((provider) => ({
      name: provider.name,
      tier: provider.tier,
      enabled: provider.isEnabled,
    })),
  },
  'Jobs module initialized',
);

// 3. Initialize Engines & Services via Dependency Injection
export const deduplicationEngine = new DeduplicationEngine();
export const aggregationService = new AggregationService(jobProviderRegistry, deduplicationEngine);

// 4. Export Primary IJobContract implementation
import { PrismaJobRepository } from '@/modules/jobs/repositories/job.repository.js';
export const jobRepository = new PrismaJobRepository();

export const jobsService = new JobsService(jobRepository, aggregationService, jobProviderRegistry);

// 5. Lifecycle hook for external module registration
export function initJobModule(): JobsService {
  return jobsService;
}
