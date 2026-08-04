import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = (path: string): string =>
  readFileSync(join(process.cwd(), 'prisma', 'migrations', path, 'migration.sql'), 'utf8');

describe('job embedding vector index contract', () => {
  it('keeps the pgvector HNSW cosine index and 768-dimension check in migrations', () => {
    const initial = migration('20260801000000_add_job_embeddings');
    const standardized = migration('20260801002000_standardize_embedding_dimensions');

    expect(`${initial}\n${standardized}`).toContain('USING hnsw ("embedding" vector_cosine_ops)');
    expect(standardized).toContain('CHECK ("dimensions" = 768)');
  });
});
