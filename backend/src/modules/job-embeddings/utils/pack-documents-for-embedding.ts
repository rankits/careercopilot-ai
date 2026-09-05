export interface BatchableDocument {
  readonly id: string;
  readonly document: string;
}

export interface DocumentBatchPackOptions {
  readonly maxItems: number;
  readonly maxCharacters: number;
}

export interface DocumentBatchPackResult<T extends BatchableDocument> {
  readonly packs: T[][];
  /** Items whose single document exceeds maxCharacters (never included in packs). */
  readonly oversized: T[];
}

/**
 * Pack documents into provider batches capped by item count and total characters.
 * Batch size is a maximum, not a guarantee.
 */
export function packDocumentsForEmbedding<T extends BatchableDocument>(
  items: readonly T[],
  options: DocumentBatchPackOptions,
): DocumentBatchPackResult<T> {
  const maxItems = Math.max(1, options.maxItems);
  const maxCharacters = Math.max(1, options.maxCharacters);
  const packs: T[][] = [];
  const oversized: T[] = [];
  let current: T[] = [];
  let currentChars = 0;

  for (const item of items) {
    const length = item.document.length;
    if (length > maxCharacters) {
      oversized.push(item);
      continue;
    }

    const wouldExceedCount = current.length >= maxItems;
    const wouldExceedChars = current.length > 0 && currentChars + length > maxCharacters;
    if (wouldExceedCount || wouldExceedChars) {
      packs.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(item);
    currentChars += length;
  }

  if (current.length > 0) packs.push(current);
  return { packs, oversized };
}
