export type EmbeddingPurpose = 'DOCUMENT' | 'QUERY';

export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  generateEmbedding(text: string, purpose?: EmbeddingPurpose): Promise<number[]>;
  generateEmbeddings(texts: readonly string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
}
