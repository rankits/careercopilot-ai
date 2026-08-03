import type { ZodType } from 'zod';

export interface StructuredAiExtractionRequest<T> {
  systemPrompt: string;
  documentText: string;
  schema: ZodType<T>;
  metadata?: {
    resumeId?: string;
    promptVersion?: string;
    schemaVersion?: string;
  };
}

export interface StructuredAiModel {
  extract<T>(request: StructuredAiExtractionRequest<T>): Promise<T>;
}

export type ResumeAiProviderName = 'google' | 'openrouter' | 'openai' | 'ollama';
