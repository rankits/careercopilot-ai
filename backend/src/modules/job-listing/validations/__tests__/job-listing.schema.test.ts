import { describe, expect, it } from 'vitest';
import { jobSearchQuerySchema } from '@/modules/job-listing/validations/job-listing.schema.js';

describe('jobSearchQuerySchema', () => {
  it('rejects sortBy=relevance (JOB-API-002)', () => {
    const result = jobSearchQuerySchema.safeParse({
      query: { sortBy: 'relevance' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown currency query param via strip/fail — currency not in schema', () => {
    const result = jobSearchQuerySchema.safeParse({
      query: { currency: 'USD', sortBy: 'newest' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).not.toHaveProperty('currency');
    }
  });

  it('accepts newest and salary sorts', () => {
    for (const sortBy of ['newest', 'salaryHighToLow', 'salaryLowToHigh'] as const) {
      const result = jobSearchQuerySchema.safeParse({ query: { sortBy } });
      expect(result.success).toBe(true);
    }
  });
});
