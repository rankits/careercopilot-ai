export interface JobEmbeddingBackfillOptions {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  readonly documentSchemaVersion: string;
  readonly batchSize: number;
  readonly afterJobId?: string;
  readonly force?: boolean;
  readonly dryRun?: boolean;
  readonly maxJobs?: number;
}

export interface JobEmbeddingBackfillCandidate {
  readonly jobId: string;
  readonly jobVersion: number;
  readonly companySlug: string;
  readonly companyName: string;
  readonly title: string;
  readonly descriptionText: string;
  readonly remoteType: string | null;
  readonly employmentType: string | null;
  readonly skills: unknown;
  readonly tags: unknown;
  readonly currentContentHash: string | null;
  readonly currentJobVersion: number | null;
  readonly currentDimensions: number | null;
}

export interface JobEmbeddingBackfillBatch {
  readonly candidates: JobEmbeddingBackfillCandidate[];
  readonly nextCursorJobId?: string;
}

export interface JobEmbeddingBackfillSummary {
  readonly scanned: number;
  readonly enqueued: number;
  readonly skippedCurrent: number;
  readonly failed: number;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly provider: string;
  readonly model: string;
  readonly cursorJobId?: string;
}
