import { describe, expect, it } from 'vitest';
import { RemoteOkProvider } from '@/providers/jobs/remoteok/index.js';

describe('remoteok provider index', () => {
  it('exports the provider placeholder', () => {
    expect(RemoteOkProvider).toEqual({});
  });
});
