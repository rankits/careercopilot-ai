import { z } from 'zod';

import { toLegacyRemotePreference } from '@/modules/auto-apply/utils/remote-preferences.util.js';

const WorkModeSchema = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);

export const SALARY_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'SGD',
  'JPY',
  'AED',
  'CHF',
] as const;

const SalaryRangeSchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.enum(SALARY_CURRENCIES).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.min != null && value.max != null && value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Salary max must be greater than or equal to min',
        path: ['max'],
      });
    }
  });

export const CandidateApplicationPreferencesSchema = z
  .object({
    desiredRoles: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    preferredLocations: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    remotePreferences: z.array(WorkModeSchema).max(3).optional(),
    /** Legacy single value — converted into remotePreferences when present. */
    remotePreference: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'ANY']).optional(),
    expectedSalary: SalaryRangeSchema.optional(),
    noticePeriodDays: z.number().int().min(0).max(365).optional(),
    willingToRelocate: z.boolean().optional(),
    requiresSponsorship: z.boolean().nullish().optional(),
    currentLocation: z.string().trim().min(2).max(120).optional(),
    currentCountry: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Z]{2}$/, 'currentCountry must be a 2-letter ISO country code')
      .optional(),
  })
  .transform((value) => {
    let remotePreferences = value.remotePreferences ?? [];
    if (remotePreferences.length === 0 && value.remotePreference) {
      if (value.remotePreference === 'ANY') {
        remotePreferences = ['REMOTE', 'HYBRID', 'ONSITE'];
      } else {
        remotePreferences = [value.remotePreference];
      }
    }
    const unique = [...new Set(remotePreferences)];
    return {
      desiredRoles: value.desiredRoles,
      preferredLocations: value.preferredLocations,
      remotePreferences: unique,
      remotePreference: toLegacyRemotePreference(unique),
      expectedSalary: value.expectedSalary,
      noticePeriodDays: value.noticePeriodDays,
      willingToRelocate: value.willingToRelocate,
      requiresSponsorship: value.requiresSponsorship,
      currentLocation: value.currentLocation,
      currentCountry: value.currentCountry,
    };
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
