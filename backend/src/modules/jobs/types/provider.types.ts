export enum ProviderHealthStatus {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  UNREACHABLE = "UNREACHABLE",
  CIRCUIT_OPEN = "CIRCUIT_OPEN",
}

export interface ProviderHealth {
  readonly status: ProviderHealthStatus;
  readonly lastCheckedAt: string;
  readonly latencyMs?: number;
  readonly errorMessage?: string;
  readonly consecutiveFailures: number;
}

export interface ProviderRateLimitStatus {
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt?: string;
}
