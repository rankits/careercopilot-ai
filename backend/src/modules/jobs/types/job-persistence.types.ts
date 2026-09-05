export type JobPersistenceOutcome =
  | 'INSERTED'
  | 'SEMANTIC_CHANGED'
  | 'METADATA_ONLY'
  | 'UNCHANGED'
  | 'FAILED'
  | 'STORAGE_AGE_SKIPPED'
  | 'EMBEDDING_AGE_SKIPPED';

export interface JobPersistenceResult {
  readonly providerInputId: string;
  readonly canonicalJobId?: string;
  readonly canonicalHash: string;
  readonly outcome: JobPersistenceOutcome;
  readonly previousVersion?: number;
  readonly newVersion?: number;
  readonly failureCode?: string;
  readonly failureMessage?: string;
}

export interface JobPersistenceBatchSummary {
  readonly inserted: number;
  readonly semanticChanged: number;
  readonly metadataOnly: number;
  readonly unchanged: number;
  readonly failed: number;
  readonly storageAgeSkipped: number;
  readonly embeddingAgeSkipped: number;
}

export interface JobPersistenceBatchResult {
  readonly outcomes: JobPersistenceResult[];
  readonly summary: JobPersistenceBatchSummary;
}
