import type { JobPersistenceOutcome } from '@/modules/jobs/types/job-persistence.types.js';

export const JOB_SEMANTIC_CONTENT_CHANGED_EVENT = 'jobs.semantic-content.changed.v1';

export interface JobSemanticContentChangedEvent {
  readonly jobId: string;
  readonly jobVersion: number;
  readonly outcome: Extract<JobPersistenceOutcome, 'INSERTED' | 'SEMANTIC_CHANGED'>;
  readonly occurredAt: string;
}
