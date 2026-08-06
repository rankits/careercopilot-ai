import { describe, expect, it } from 'vitest';
import { AdzunaProvider } from '@/providers/jobs/adzuna/index.js';

describe('adzuna provider index', () => {
  it('exports the provider placeholder', () => {
    expect(AdzunaProvider).toEqual({});
  });
});
