import { JobProviderRegistry } from '@/modules/jobs/registry/job-provider.registry.js';
import { DeduplicationEngine } from '@/modules/jobs/services/aggregation/deduplication.engine.js';
import { AggregationService } from '@/modules/jobs/services/aggregation/aggregation.service.js';
import { GreenhouseJobProvider } from '@/modules/jobs/providers/greenhouse/provider.js';
import { OpenPublicFeedProvider } from '@/modules/jobs/providers/public-feed/public-feed.provider.js';
import { RemotiveJobProvider } from '@/modules/jobs/providers/remotive/provider.js';
import { JobicyJobProvider } from '@/modules/jobs/providers/jobicy/provider.js';
import { HimalayasJobProvider } from '@/modules/jobs/providers/himalayas/provider.js';
import { RemoteJobsOrgProvider } from '@/modules/jobs/providers/remotejobs-org/provider.js';
import { RemoteOkJobProvider } from '@/modules/jobs/providers/remoteok/provider.js';
import { LeverJobProvider } from '@/modules/jobs/providers/lever/provider.js';
import { AshbyJobProvider } from '@/modules/jobs/providers/ashby/provider.js';
import { JobsService } from '@/modules/jobs/services/jobs.service.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { jobsLogger } from '@/shared/utils/logger.js';

// 1. Initialize Registry
export const jobProviderRegistry = new JobProviderRegistry();

// 2. Instantiate and Register Providers
const defaultGreenhouseProvider = new GreenhouseJobProvider({
  // Boards probed live before wiring (404 boards omitted).
  boards: [
    { boardToken: 'stripe', companyName: 'Stripe' },
    { boardToken: 'airbnb', companyName: 'Airbnb' },
    { boardToken: 'coinbase', companyName: 'Coinbase' },
    { boardToken: 'figma', companyName: 'Figma' },
    { boardToken: 'datadog', companyName: 'Datadog' },
    { boardToken: 'cloudflare', companyName: 'Cloudflare' },
    { boardToken: 'discord', companyName: 'Discord' },
    { boardToken: 'robinhood', companyName: 'Robinhood' },
    { boardToken: 'brex', companyName: 'Brex' },
  ],
  tier: ProviderTier.PUBLIC,
  timeoutMs: 12000,
  includeContent: true,
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
const remoteJobsOrgProvider = new RemoteJobsOrgProvider({
  feeds: [{ category: 'programming', limit: 50 }, { category: 'design', limit: 30 }, { limit: 40 }],
  tier: ProviderTier.PUBLIC,
});
const remoteOkProvider = new RemoteOkJobProvider({ tier: ProviderTier.PUBLIC });
const leverProvider = new LeverJobProvider({
  sites: [
    { site: 'leverdemo', companyName: 'Lever Demo' },
    { site: 'spotify', companyName: 'Spotify' },
    { site: 'palantir', companyName: 'Palantir' },
  ],
  tier: ProviderTier.PUBLIC,
});

jobProviderRegistry.register(defaultGreenhouseProvider);
jobProviderRegistry.register(defaultPublicFeedProvider);
jobProviderRegistry.register(remotiveProvider);
jobProviderRegistry.register(jobicyProvider);
jobProviderRegistry.register(himalayasProvider);
jobProviderRegistry.register(remoteJobsOrgProvider);
jobProviderRegistry.register(remoteOkProvider);
const ashbyProvider = new AshbyJobProvider({
  boards: [
    { boardName: 'notion', companyName: 'Notion' },
    { boardName: 'openai', companyName: 'OpenAI' },
    { boardName: 'ramp', companyName: 'Ramp' },
    { boardName: 'linear', companyName: 'Linear' },
  ],
  tier: ProviderTier.PUBLIC,
});

jobProviderRegistry.register(leverProvider);
jobProviderRegistry.register(ashbyProvider);

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
