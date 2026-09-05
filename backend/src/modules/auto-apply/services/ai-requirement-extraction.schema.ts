import { z } from 'zod';

/**
 * Strict schema for AI job-page requirement extraction.
 * Analyzer never emits readiness decisions — only facts + evidence.
 */
export const AI_EXTRACTABLE_REQUIREMENT_CODES = [
  'WORK_REGION',
  'TOTAL_EXPERIENCE_YEARS',
  'MOBILE_DESIGN_EXPERIENCE',
  'PORTFOLIO',
  'SPONSORSHIP',
  'WORK_AUTHORIZATION',
] as const;

export type AiExtractableRequirementCode = (typeof AI_EXTRACTABLE_REQUIREMENT_CODES)[number];

const GeographicSchema = z.object({
  rawValue: z.string().min(1).max(200),
  normalizedRegion: z.string().max(64).optional(),
  explicitCountries: z.array(z.string().max(64)).max(20).default([]),
  interpretationStatus: z
    .enum(['EXPLICIT_COUNTRIES', 'NORMALIZED_REGION', 'REVIEW_REQUIRED', 'UNKNOWN'])
    .default('REVIEW_REQUIRED'),
});

export const AiExtractedRequirementSchema = z.object({
  code: z.enum(AI_EXTRACTABLE_REQUIREMENT_CODES),
  operator: z.enum(['IN', 'GTE', 'LTE', 'EQ', 'REQUIRED']).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  importance: z.enum(['REQUIRED', 'PREFERRED', 'OPTIONAL']),
  assertion: z.enum([
    'REQUIRES',
    'ALLOWS',
    'DOES_NOT_ALLOW',
    'PROVIDES',
    'DOES_NOT_PROVIDE',
    'UNKNOWN',
  ]),
  confidence: z.number().min(0).max(1),
  evidenceStrength: z.enum([
    'AUTHORITATIVE_STRUCTURED',
    'EXPLICIT_TEXT',
    'STRONG_INFERENCE',
    'WEAK_INFERENCE',
  ]),
  sourceText: z.string().min(8).max(500),
  geographic: GeographicSchema.optional(),
});

export const AiRequirementExtractionResponseSchema = z.object({
  requirements: z.array(AiExtractedRequirementSchema).max(12),
});

export type AiRequirementExtractionResponse = z.infer<typeof AiRequirementExtractionResponseSchema>;
