import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/messaging/index.js', () => ({
  messageBus: {
    publishEvent: vi.fn(),
  },
  MessageExchanges: { DOMAIN_EVENTS: 'careercopilot.events' },
  MessageRoutingKeys: { APPLICATION_SUBMIT: 'applications.submit' },
}));

import { messageBus } from '@/infrastructure/messaging/index.js';
import { ApplicationSubmissionQueue } from '@/queues/application-submission.queue.js';
import { QueuePublishError } from '@/modules/auto-apply/errors/queue-publish.error.js';

describe('ApplicationSubmissionQueue (AA-009)', () => {
  beforeEach(() => {
    vi.mocked(messageBus.publishEvent).mockReset();
  });

  it('resolves when publishEvent returns true', async () => {
    vi.mocked(messageBus.publishEvent).mockResolvedValue(true);

    await expect(
      ApplicationSubmissionQueue.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' }),
    ).resolves.toBeUndefined();
  });

  it('throws QueuePublishError when publishEvent returns false (falsy failure)', async () => {
    vi.mocked(messageBus.publishEvent).mockResolvedValue(false);

    await expect(
      ApplicationSubmissionQueue.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(QueuePublishError);
  });

  it('propagates thrown publish errors', async () => {
    vi.mocked(messageBus.publishEvent).mockRejectedValue(new Error('socket hang up'));

    await expect(
      ApplicationSubmissionQueue.enqueue({ jobApplicationId: 'ja-1', userId: 'user-1' }),
    ).rejects.toThrow('socket hang up');
  });
});
