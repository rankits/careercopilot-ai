import { describe, expect, it } from 'vitest';
import { JobSyncQueue } from '@/queues/job-sync.queue.js';

describe('JobSyncQueue', () => {
  it('exports the placeholder producer', () => {
    expect(JobSyncQueue).toEqual({});
  });
});
