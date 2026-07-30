import { ProviderTier } from "@/modules/jobs/types/job.types.js";

export interface GreenhouseProviderConfig {
  readonly boardToken: string;
  readonly companyName?: string;
  readonly tier?: ProviderTier; // PUBLIC or FREE_AUTH
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

