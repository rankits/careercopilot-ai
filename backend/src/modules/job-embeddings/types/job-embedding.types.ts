export interface JobEmbeddingRecord {
  readonly id: string;
  readonly jobId: string;
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  readonly contentHash: string;
  readonly jobVersion: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpsertJobEmbeddingInput {
  readonly jobId: string;
  readonly provider: string;
  readonly model: string;
  readonly contentHash: string;
  readonly jobVersion: number;
  readonly embedding: readonly number[];
}

export interface JobEmbeddingSearchFilters {
  readonly companySlugs?: readonly string[];
  readonly remoteTypes?: readonly string[];
  readonly excludeJobIds?: readonly string[];
  readonly postedAfter?: Date;
  readonly minSalary?: number;
  readonly maxSalary?: number;
  readonly currency?: string;
}

export interface SearchJobEmbeddingsInput {
  readonly provider: string;
  readonly model: string;
  readonly embedding: readonly number[];
  readonly limit?: number;
  readonly filters?: JobEmbeddingSearchFilters;
}

export interface JobEmbeddingSearchResult {
  readonly jobId: string;
  readonly similarity: number;
}

export interface JobEmbeddingSource {
  readonly jobId: string;
  readonly version: number;
  readonly status: string;
  readonly companySlug: string;
  readonly companyName: string;
  readonly title: string;
  readonly descriptionText: string;
  readonly remoteType: string | null;
  readonly employmentType: string | null;
  readonly skills: unknown;
  readonly tags: unknown;
}
