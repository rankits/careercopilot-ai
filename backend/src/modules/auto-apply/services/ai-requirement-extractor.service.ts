import { z } from 'zod';

import type { OpenRouterConfig } from '@/modules/resumes/ai/providers/openrouter/openrouter.js';
import { extractTextContent, parseProviderJson } from '@/modules/resumes/ai/json.js';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import { logger } from '@/shared/logger/logger.js';
import type {
  ExtractedRequirement,
  EvidenceStrength,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';
import {
  AiRequirementExtractionResponseSchema,
  type AiRequirementExtractionResponse,
} from '@/modules/auto-apply/services/ai-requirement-extraction.schema.js';
import {
  AI_REQUIREMENT_EXTRACTION_SYSTEM_PROMPT,
  buildAiRequirementExtractionUserPrompt,
} from '@/modules/auto-apply/services/ai-requirement-extraction.prompt.js';
import type {
  AiRequirementExtractionInput,
  IAiRequirementExtractor,
} from '@/modules/auto-apply/services/ai-requirement-extractor.port.js';
import { NoopAiRequirementExtractor } from '@/modules/auto-apply/services/ai-requirement-extractor.port.js';
import { recordAnalysisAiExtraction } from '@/modules/auto-apply/observability/analysis.metrics.js';

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string; code?: number | string };
};

function resolveOpenRouterConfig(): OpenRouterConfig | null {
  const apiKey = resumeConfig.ai.openrouter.apiKey?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: resumeConfig.ai.openrouter.model,
    baseUrl: resumeConfig.ai.openrouter.baseUrl,
    temperature: 0.1,
    timeoutMs: Math.min(resumeConfig.ai.openrouter.timeoutMs, 45_000),
  };
}

function quoteSupportedBySource(sourceText: string, sanitizedText: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalize(sanitizedText).includes(normalize(sourceText));
}

function clampEvidenceStrength(strength: EvidenceStrength, confidence: number): EvidenceStrength {
  // High model confidence alone cannot hard-block without explicit text support.
  if (strength === 'AUTHORITATIVE_STRUCTURED') return 'EXPLICIT_TEXT';
  if (strength === 'EXPLICIT_TEXT' && confidence < 0.7) return 'STRONG_INFERENCE';
  return strength;
}

/**
 * Maps schema-validated AI output into ExtractedRequirement facts.
 * Drops unsupported / injection-style claims and unverifiable quotes.
 */
export function mapAiExtractionToRequirements(
  parsed: AiRequirementExtractionResponse,
  input: AiRequirementExtractionInput,
): ExtractedRequirement[] {
  const out: ExtractedRequirement[] = [];

  for (const item of parsed.requirements) {
    if (!quoteSupportedBySource(item.sourceText, input.sanitizedText)) {
      continue;
    }

    const evidenceStrength = clampEvidenceStrength(item.evidenceStrength, item.confidence);
    const required =
      item.importance === 'REQUIRED' &&
      (item.assertion === 'REQUIRES' ||
        item.assertion === 'DOES_NOT_ALLOW' ||
        item.assertion === 'DOES_NOT_PROVIDE');

    out.push({
      code: item.code,
      operator: item.operator,
      value: item.value,
      importance: item.importance,
      assertion: item.assertion,
      required:
        item.assertion === 'DOES_NOT_PROVIDE' || item.assertion === 'DOES_NOT_ALLOW'
          ? false
          : required,
      confidence: item.confidence,
      evidenceStrength,
      extractionMethod: 'AI_EXTRACTION',
      sourceText: item.sourceText,
      sourceUrl: input.sourceUrl,
      source: {
        type: 'JOB_DESCRIPTION',
        text: item.sourceText,
        url: input.sourceUrl,
      },
      geographic: item.code === 'WORK_REGION' ? item.geographic : undefined,
      reviewStatus:
        evidenceStrength === 'WEAK_INFERENCE' || evidenceStrength === 'STRONG_INFERENCE'
          ? 'REVIEW_REQUIRED'
          : 'AUTO_ACCEPTED',
    });
  }

  return out;
}

export class OpenRouterAiRequirementExtractor implements IAiRequirementExtractor {
  constructor(private readonly config: OpenRouterConfig) {}

  async extract(input: AiRequirementExtractionInput): Promise<ExtractedRequirement[]> {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://careercopilot.app',
          'X-Title': 'CareerCopilot Job Page Analyzer',
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' },
          max_tokens: 2000,
          messages: [
            { role: 'system', content: AI_REQUIREMENT_EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildAiRequirementExtractionUserPrompt(input),
            },
          ],
        }),
      });

      const payload = (await response.json().catch(() => null)) as OpenRouterChatResponse | null;
      if (!response.ok) {
        const message =
          payload?.error?.message || `OpenRouter request failed with status ${response.status}`;
        throw new Error(message);
      }

      const rawText = extractTextContent(payload?.choices?.[0]?.message?.content);
      const rawJson = parseProviderJson(rawText, 'OpenRouter');
      const parsed = AiRequirementExtractionResponseSchema.parse(rawJson);
      const requirements = mapAiExtractionToRequirements(parsed, input);

      recordAnalysisAiExtraction({
        success: true,
        durationMs: Date.now() - started,
        requirementCount: requirements.length,
        reviewRequiredCount: requirements.filter((r) => r.reviewStatus === 'REVIEW_REQUIRED')
          .length,
      });

      return requirements;
    } catch (error) {
      recordAnalysisAiExtraction({
        success: false,
        durationMs: Date.now() - started,
        requirementCount: 0,
        reviewRequiredCount: 0,
        failureCode: error instanceof z.ZodError ? 'SCHEMA_INVALID' : 'AI_EXTRACT_FAILED',
      });
      logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          metric: 'auto_apply.analysis.ai_extraction_failed',
        },
        'AI requirement extraction failed; continuing with deterministic results only',
      );
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Prefer OpenRouter when configured; otherwise no-op (deterministic-only path). */
export function createAiRequirementExtractor(): IAiRequirementExtractor {
  const config = resolveOpenRouterConfig();
  if (!config) return new NoopAiRequirementExtractor();
  return new OpenRouterAiRequirementExtractor(config);
}
