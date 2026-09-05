import { describe, expect, it } from 'vitest';
import { GreenhouseProvider } from '@/providers/jobs/greenhouse/index.js';

describe('greenhouse provider index', () => {
  it('exports the provider placeholder', () => {
    expect(GreenhouseProvider).toEqual({});
  });
});
