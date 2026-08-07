import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import type { SubmissionJobPayload } from '@/modules/auto-apply/services/submission-processing.service.js';
import { QueuePublishError } from '@/modules/auto-apply/errors/queue-publish.error.js';

/**
 * Producer-side API for application submission. The approve/queue HTTP
 * endpoint publishes a job and returns immediately — the actual channel
 * submission (and its latency/failure handling) happens out-of-band in
 * `workers/application-submission.worker.ts`, following the same
 * publish-and-return pattern as `queues/email.queue.ts`.
 *
 * AA-009: `RabbitMQBusDriver.publish` returns `false` on failure instead of
 * throwing. We must treat a falsy result as an error so orchestration can
 * roll back QUEUED → APPROVED.
 */
export const ApplicationSubmissionQueue = {
  async enqueue(payload: SubmissionJobPayload): Promise<void> {
    const published = await messageBus.publishEvent(
      MessageExchanges.DOMAIN_EVENTS,
      MessageRoutingKeys.APPLICATION_SUBMIT,
      payload,
    );
    if (!published) {
      throw new QueuePublishError(
        'Broker publish returned failure for APPLICATION_SUBMIT (no message delivered)',
      );
    }
  },
};
