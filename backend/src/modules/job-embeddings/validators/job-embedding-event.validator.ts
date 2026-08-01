import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const parseJobSemanticContentChangedEvent = (
  value: unknown,
): JobSemanticContentChangedEvent => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AppError('Invalid job embedding event payload', 422, 'INVALID_EMBEDDING_EVENT');
  }
  const event = value as Record<string, unknown>;
  if (
    typeof event.jobId !== 'string' ||
    !event.jobId.trim() ||
    !Number.isInteger(event.jobVersion) ||
    (event.jobVersion as number) < 1 ||
    (event.outcome !== 'INSERTED' && event.outcome !== 'SEMANTIC_CHANGED') ||
    typeof event.occurredAt !== 'string' ||
    Number.isNaN(Date.parse(event.occurredAt))
  ) {
    throw new AppError('Invalid job embedding event payload', 422, 'INVALID_EMBEDDING_EVENT');
  }
  return {
    jobId: event.jobId,
    jobVersion: event.jobVersion as number,
    outcome: event.outcome,
    occurredAt: event.occurredAt,
  };
};
