import { describe, expect, it } from 'vitest';
import { ResumeQueue } from '@/queues/resume.queue.js';

describe('ResumeQueue', () => {
  it('exports the placeholder producer', () => {
    expect(ResumeQueue).toEqual({});
  });
});
