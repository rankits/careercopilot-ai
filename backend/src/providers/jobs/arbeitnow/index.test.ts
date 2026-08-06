import { describe, expect, it } from 'vitest';
import { ArbeitnowProvider } from '@/providers/jobs/arbeitnow/index.js';

describe('arbeitnow provider index', () => {
  it('exports the provider placeholder', () => {
    expect(ArbeitnowProvider).toEqual({});
  });
});
