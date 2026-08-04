import { z } from 'zod';

const SalaryRangeSchema = z.object({
  min: z.number().positive().optional(),
  max: z.number().positive().optional(),
  currency: z.string().trim().length(3).optional(),
});

export const CandidateApplicationPreferencesSchema = z.object({
  desiredRoles: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  preferredLocations: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  remotePreference: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'ANY']).default('ANY'),
  expectedSalary: SalaryRangeSchema.optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  willingToRelocate: z.boolean().optional(),
  requiresSponsorship: z.boolean().optional(),
});

export const CandidateApplicationLinksSchema = z.object({
  linkedin: z.string().trim().url().max(2048).optional(),
  github: z.string().trim().url().max(2048).optional(),
  portfolio: z.string().trim().url().max(2048).optional(),
});

export const UpsertCandidateApplicationProfileSchema = z.object({
  preferences: CandidateApplicationPreferencesSchema.optional(),
  links: CandidateApplicationLinksSchema.optional(),
});

export type UpsertCandidateApplicationProfileInput = z.infer<
  typeof UpsertCandidateApplicationProfileSchema
>;
