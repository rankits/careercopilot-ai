import { describe, expect, it } from 'vitest';
import { startResumeWorker } from '@/workers/resume.worker.js';

describe('resume.worker', () => {
  it('starts the placeholder worker', async () => {
    await expect(startResumeWorker()).resolves.toBeUndefined();
  });
});
