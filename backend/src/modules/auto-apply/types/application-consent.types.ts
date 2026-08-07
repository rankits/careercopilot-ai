export type ConsentTypeValue =
  'RESUME_USAGE' | 'CONTENT_GENERATION' | 'EMAIL_SUBMISSION' | 'AUTOPILOT_SUBMISSION';

export interface ApplicationConsentDto {
  id: string;
  userId: string;
  consentType: ConsentTypeValue;
  version: number;
  grantedAt: Date;
  revokedAt: Date | null;
}
