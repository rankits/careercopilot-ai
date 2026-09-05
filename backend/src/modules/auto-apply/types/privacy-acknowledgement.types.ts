export const CURRENT_PRIVACY_POLICY_VERSION = '2026-08-01';

export interface PrivacyAcknowledgementDto {
  policyVersion: string;
  acknowledgedAt: string;
}

export interface PrivacyAcknowledgementInput {
  policyVersion: string;
}
