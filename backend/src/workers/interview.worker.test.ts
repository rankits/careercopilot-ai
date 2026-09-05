import { describe, expect, it } from 'vitest';
import { startInterviewWorker } from '@/workers/interview.worker.js';

describe('interview.worker', () => {
  it('starts the placeholder worker', async () => {
    await expect(startInterviewWorker()).resolves.toBeUndefined();
  });
});
