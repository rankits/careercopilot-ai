import { ProviderTier } from "../../types/job.types.js";

export interface LeverProviderConfig {
  readonly companyId: string;
  readonly apiKey?: string;
  readonly tier?: ProviderTier; // FREE_AUTH or PAID_AUTH
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}
