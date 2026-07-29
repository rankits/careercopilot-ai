import { ProviderTier } from "@/modules/jobs/types/job.types.js";

export interface ArbeitnowProviderConfig {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
  readonly tier?: ProviderTier;
}
