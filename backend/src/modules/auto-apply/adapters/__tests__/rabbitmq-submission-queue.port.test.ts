import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/queues/application-submission.queue.js', () => ({
  ApplicationSubmissionQueue: {
    enqueue: vi.fn(),
  },
}));

import { ApplicationSubmissionQueue } from '@/queues/application-submission.queue.js';
import { RabbitMqSubmissionQueuePort } from '@/modules/auto-apply/adapters/rabbitmq-submission-queue.port.js';
import { QueuePublishError } from '@/modules/auto-apply/errors/queue-publish.error.js';

describe('RabbitMqSubmissionQueuePort (AA-009)', () => {
  const port = new RabbitMqSubmissionQueuePort();

  beforeEach(() => {
    vi.mocked(ApplicationSubmissionQueue.enqueue).mockReset();
  });

  it('propagates QueuePublishError from the queue', async () => {
    vi.mocked(ApplicationSubmissionQueue.enqueue).mockRejectedValue(
      new QueuePublishError('broker returned false'),
    );

    await expect(
      port.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(QueuePublishError);
  });

  it('wraps unexpected errors as QueuePublishError', async () => {
    vi.mocked(ApplicationSubmissionQueue.enqueue).mockRejectedValue(new Error('channel closed'));

    await expect(port.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' })).rejects.toEqual(
      expect.objectContaining({
        name: 'QueuePublishError',
        message: 'channel closed',
        code: 'QUEUE_PUBLISH_FAILED',
      }),
    );
  });

  it('resolves when the queue publish succeeds', async () => {
    vi.mocked(ApplicationSubmissionQueue.enqueue).mockResolvedValue(undefined);

    await expect(
      port.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' }),
    ).resolves.toBeUndefined();
  });
});
