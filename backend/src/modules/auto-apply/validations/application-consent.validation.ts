import { z } from 'zod';

export const ConsentTypeSchema = z.enum([
  'RESUME_USAGE',
  'CONTENT_GENERATION',
  'EMAIL_SUBMISSION',
  'AUTOPILOT_SUBMISSION',
]);

export const GrantApplicationConsentSchema = z.object({
  consentType: ConsentTypeSchema,
});

export type GrantApplicationConsentInput = z.infer<typeof GrantApplicationConsentSchema>;
