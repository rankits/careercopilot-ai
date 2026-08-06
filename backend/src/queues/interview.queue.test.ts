import { describe, expect, it } from 'vitest';
import { InterviewQueue } from '@/queues/interview.queue.js';

describe('InterviewQueue', () => {
  it('exports the placeholder producer', () => {
    expect(InterviewQueue).toEqual({});
  });
});
