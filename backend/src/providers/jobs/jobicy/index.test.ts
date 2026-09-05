import { describe, expect, it } from 'vitest';
import { JobicyProvider } from '@/providers/jobs/jobicy/index.js';

describe('jobicy provider index', () => {
  it('exports the provider placeholder', () => {
    expect(JobicyProvider).toEqual({});
  });
});
