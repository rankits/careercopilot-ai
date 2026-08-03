export enum ProviderTier {
  PUBLIC = 'PUBLIC',
  FREE_AUTH = 'FREE_AUTH',
  PAID_AUTH = 'PAID_AUTH',
}

export enum JobSalaryPeriod {
  HOURLY = 'HOURLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface PaginationOptions {
  readonly page?: number;
  readonly limit?: number;
}

export interface PaginatedResult<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface JobSearchFilters {
  readonly query?: string;
  readonly company?: string;
  readonly location?: string;
  readonly isRemote?: boolean;
  readonly minSalary?: number;
  readonly providers?: string[];
  readonly allowedTiers?: ProviderTier[];
}

export interface BulkIngestionOptions {
  readonly providers?: string[];
  readonly allowedTiers?: ProviderTier[];
  readonly concurrency?: number;
  readonly dryRun?: boolean;
}

export interface BulkIngestionSummary {
  readonly totalHarvested: number;
  readonly totalUnique: number;
  readonly totalDuplicates: number;
  readonly persistedInserted: number;
  readonly persistedUpdated: number;
  readonly persistedMetadataOnly: number;
  readonly persistedUnchanged: number;
  readonly persistedFailed: number;
  readonly storageAgeSkipped: number;
  readonly embeddingAgeSkipped: number;
  readonly providerBreakdown: Record<
    string,
    { fetched: number; durationMs: number; error?: string }
  >;
}
