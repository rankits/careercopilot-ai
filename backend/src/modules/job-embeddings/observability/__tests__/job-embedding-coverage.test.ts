import { describe, expect, it } from 'vitest';
import { computeEmbeddingCoverageRatio } from '@/modules/job-embeddings/observability/job-embedding-coverage.js';

describe('job embedding coverage', () => {
  it('computes ratio capped at 1', () => {
    expect(computeEmbeddingCoverageRatio(100, 75)).toBe(0.75);
    expect(computeEmbeddingCoverageRatio(0, 0)).toBe(1);
    expect(computeEmbeddingCoverageRatio(10, 15)).toBe(1);
  });
});
