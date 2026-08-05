/**
 * Thrown when publishing an application-submission job to the broker fails
 * (thrown errors or a falsy publish return). Orchestration maps this to
 * `503 QUEUE_PUBLISH_FAILED` and rolls back QUEUED → APPROVED (AA-009).
 */
export class QueuePublishError extends Error {
  readonly code = 'QUEUE_PUBLISH_FAILED' as const;

  constructor(message = 'Failed to publish application submission job to the broker') {
    super(message);
    this.name = 'QueuePublishError';
  }
}
