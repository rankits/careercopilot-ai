/**
 * Optional AI extraction port. Phase-1 production path uses deterministic rules.
 * Implementations MUST treat page content as untrusted data, never instructions,
 * and MUST validate output with a strict schema before persistence.
 */
import type { ExtractedRequirement } from '@/modules/auto-apply/types/application-page-analysis.types.js';

export interface AiRequirementExtractionInput {
  sanitizedText: string;
  sourceUrl: string;
  provider: string;
}

export interface IAiRequirementExtractor {
  extract(input: AiRequirementExtractionInput): Promise<ExtractedRequirement[]>;
}

/** No-op AI extractor — keeps the interface wired without enabling model calls. */
export class NoopAiRequirementExtractor implements IAiRequirementExtractor {
  async extract(_input: AiRequirementExtractionInput): Promise<ExtractedRequirement[]> {
    return [];
  }
}
