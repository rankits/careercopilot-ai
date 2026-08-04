import { ApplicationSubmissionQueue } from '@/queues/application-submission.queue.js';
import { ISubmissionQueuePort } from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';

export class RabbitMqSubmissionQueuePort implements ISubmissionQueuePort {
  async enqueue(payload: { jobApplicationId: string; userId: string }): Promise<void> {
    await ApplicationSubmissionQueue.enqueue(payload);
  }
}
