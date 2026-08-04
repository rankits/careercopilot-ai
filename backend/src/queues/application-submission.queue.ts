import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import type { SubmissionJobPayload } from '@/modules/auto-apply/services/submission-processing.service.js';

/**
 * Producer-side API for application submission. The approve/queue HTTP
 * endpoint publishes a job and returns immediately — the actual channel
 * submission (and its latency/failure handling) happens out-of-band in
 * `workers/application-submission.worker.ts`, following the same
 * publish-and-return pattern as `queues/email.queue.ts`.
 */
export const ApplicationSubmissionQueue = {
  async enqueue(payload: SubmissionJobPayload): Promise<void> {
    await messageBus.publishEvent(
      MessageExchanges.DOMAIN_EVENTS,
      MessageRoutingKeys.APPLICATION_SUBMIT,
      payload,
    );
  },
};
