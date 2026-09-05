import { describe, expect, it } from 'vitest';
import { RemotiveProvider } from '@/providers/jobs/remotive/index.js';

describe('remotive provider index', () => {
  it('exports the provider placeholder', () => {
    expect(RemotiveProvider).toEqual({});
  });
});
