import { describe, expect, it } from 'vitest';
import { NotificationQueue } from '@/queues/notification.queue.js';

describe('NotificationQueue', () => {
  it('exports the placeholder producer', () => {
    expect(NotificationQueue).toEqual({});
  });
});
