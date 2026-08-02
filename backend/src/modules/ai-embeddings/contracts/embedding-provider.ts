export type EmbeddingPurpose = 'DOCUMENT' | 'QUERY';

export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  generateEmbedding(text: string, purpose?: EmbeddingPurpose): Promise<number[]>;
  generateEmbeddings(texts: readonly string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
  embedDocument?(text: string): Promise<number[]>;
  embedQuery?(text: string): Promise<number[]>;
  embedDocuments?(texts: readonly string[]): Promise<number[][]>;
  embedQueries?(texts: readonly string[]): Promise<number[][]>;
}
