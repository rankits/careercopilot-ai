import { describe, expect, it } from 'vitest';
import { packDocumentsForEmbedding } from '@/modules/job-embeddings/utils/pack-documents-for-embedding.js';

describe('packDocumentsForEmbedding', () => {
  it('packs by max item count', () => {
    const items = [
      { id: '1', document: 'a' },
      { id: '2', document: 'b' },
      { id: '3', document: 'c' },
    ];
    const { packs, oversized } = packDocumentsForEmbedding(items, {
      maxItems: 2,
      maxCharacters: 10_000,
    });
    expect(oversized).toEqual([]);
    expect(packs).toEqual([
      [
        { id: '1', document: 'a' },
        { id: '2', document: 'b' },
      ],
      [{ id: '3', document: 'c' }],
    ]);
  });

  it('splits when the next document would exceed the character budget', () => {
    const items = [
      { id: '1', document: 'aaaa' },
      { id: '2', document: 'bbbb' },
      { id: '3', document: 'c' },
    ];
    const { packs, oversized } = packDocumentsForEmbedding(items, {
      maxItems: 32,
      maxCharacters: 7,
    });
    expect(oversized).toEqual([]);
    expect(packs).toEqual([
      [{ id: '1', document: 'aaaa' }],
      [
        { id: '2', document: 'bbbb' },
        { id: '3', document: 'c' },
      ],
    ]);
  });

  it('isolates documents that alone exceed the character budget', () => {
    const items = [
      { id: '1', document: 'ok' },
      { id: '2', document: 'x'.repeat(20) },
      { id: '3', document: 'also-ok' },
    ];
    const { packs, oversized } = packDocumentsForEmbedding(items, {
      maxItems: 32,
      maxCharacters: 10,
    });
    expect(oversized).toEqual([{ id: '2', document: 'x'.repeat(20) }]);
    expect(packs).toEqual([
      [
        { id: '1', document: 'ok' },
        { id: '3', document: 'also-ok' },
      ],
    ]);
  });
});
