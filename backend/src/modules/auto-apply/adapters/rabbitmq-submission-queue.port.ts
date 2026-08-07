import { ApplicationSubmissionQueue } from '@/queues/application-submission.queue.js';
import { ISubmissionQueuePort } from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { QueuePublishError } from '@/modules/auto-apply/errors/queue-publish.error.js';

/**
 * RabbitMQ-backed submission queue port. Always throws on publish failure
 * (including falsy driver returns) so orchestration's catch/rollback runs (AA-009).
 */
export class RabbitMqSubmissionQueuePort implements ISubmissionQueuePort {
  async enqueue(payload: { jobApplicationId: string; userId: string }): Promise<void> {
    try {
      await ApplicationSubmissionQueue.enqueue(payload);
    } catch (error) {
      if (error instanceof QueuePublishError) {
        throw error;
      }
      throw new QueuePublishError(
        error instanceof Error ? error.message : 'Failed to publish submission to the queue',
      );
    }
  }
}
