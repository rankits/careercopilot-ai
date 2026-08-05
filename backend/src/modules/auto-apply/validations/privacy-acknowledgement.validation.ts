import { z } from 'zod';
import { CURRENT_PRIVACY_POLICY_VERSION } from '@/modules/auto-apply/types/privacy-acknowledgement.types.js';

export const PrivacyAcknowledgementSchema = z.object({
  policyVersion: z
    .string()
    .trim()
    .min(1, 'Policy version is required')
    .max(32)
    .refine(
      (value) => value === CURRENT_PRIVACY_POLICY_VERSION,
      `Unsupported policy version; expected ${CURRENT_PRIVACY_POLICY_VERSION}`,
    ),
});

export type PrivacyAcknowledgementInput = z.infer<typeof PrivacyAcknowledgementSchema>;
