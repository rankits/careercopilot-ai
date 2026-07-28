import { JobProviderRegistry } from "./registry/job-provider.registry.js";
import { DeduplicationEngine } from "./services/aggregation/deduplication.engine.js";
import { AggregationService } from "./services/aggregation/aggregation.service.js";
import { GreenhouseJobProvider } from "./providers/greenhouse/provider.js";
import { OpenPublicFeedProvider } from "./providers/public-feed/public-feed.provider.js";
import { JobsService } from "./services/jobs.service.js";
import { ProviderTier } from "./types/job.types.js";
import { jobsLogger } from "../../shared/utils/logger.js";

// 1. Initialize Registry
export const jobProviderRegistry = new JobProviderRegistry();

// 2. Instantiate and Register Providers (Greenhouse + Public Feed)
const defaultGreenhouseProvider = new GreenhouseJobProvider({
  boardToken: "stripe",
  companyName: "Stripe",
  tier: ProviderTier.PUBLIC,
  timeoutMs: 8000,
});

const defaultPublicFeedProvider = new OpenPublicFeedProvider();

jobProviderRegistry.register(defaultGreenhouseProvider);
jobProviderRegistry.register(defaultPublicFeedProvider);

jobsLogger.info(
  {
    providers: jobProviderRegistry.getAll().map((provider) => ({
      name: provider.name,
      tier: provider.tier,
      enabled: provider.isEnabled,
    })),
  },
  "Jobs module initialized",
);

// 3. Initialize Engines & Services via Dependency Injection
export const deduplicationEngine = new DeduplicationEngine();
export const aggregationService = new AggregationService(
  jobProviderRegistry,
  deduplicationEngine
);

// 4. Export Primary IJobContract implementation
export const jobsService = new JobsService(
  aggregationService,
  jobProviderRegistry
);

// 5. Lifecycle hook for external module registration
export function initJobModule(): JobsService {
  return jobsService;
}
