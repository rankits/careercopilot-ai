import { describe, expect, it } from 'vitest';
import { startNotificationWorker } from '@/workers/notification.worker.js';

describe('notification.worker', () => {
  it('starts the placeholder worker', async () => {
    await expect(startNotificationWorker()).resolves.toBeUndefined();
  });
});
