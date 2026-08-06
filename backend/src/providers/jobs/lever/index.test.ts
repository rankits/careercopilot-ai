import { describe, expect, it } from 'vitest';
import { LeverProvider } from '@/providers/jobs/lever/index.js';

describe('lever provider index', () => {
  it('exports the provider placeholder', () => {
    expect(LeverProvider).toEqual({});
  });
});
