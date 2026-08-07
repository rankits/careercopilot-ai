import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import {
  ApplicationConsentDto,
  ConsentTypeValue,
} from '@/modules/auto-apply/types/application-consent.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

/** Consent types that remain in the enum for Later automation but must not be grantable yet (AA-002). */
const CONSENT_TYPES_NOT_AVAILABLE_YET: ReadonlySet<ConsentTypeValue> = new Set([
  'EMAIL_SUBMISSION',
  'AUTOPILOT_SUBMISSION',
]);

export class ApplicationConsentService {
  constructor(private readonly repository: IApplicationConsentRepository) {}

  async listConsents(userId: string): Promise<ApplicationConsentDto[]> {
    return this.repository.findManyByUserId(userId);
  }

  async hasActiveConsent(userId: string, consentType: ConsentTypeValue): Promise<boolean> {
    const consent = await this.repository.findActiveByType(userId, consentType);
    return consent !== null;
  }

  async grantConsent(
    userId: string,
    consentType: ConsentTypeValue,
  ): Promise<ApplicationConsentDto> {
    if (CONSENT_TYPES_NOT_AVAILABLE_YET.has(consentType)) {
      throw new AppError(
        "This consent type isn't available yet.",
        403,
        'CONSENT_NOT_AVAILABLE_YET',
      );
    }
    return this.repository.grant(userId, consentType);
  }

  async revokeConsent(userId: string, id: string): Promise<ApplicationConsentDto> {
    return this.repository.revoke(userId, id);
  }
}
