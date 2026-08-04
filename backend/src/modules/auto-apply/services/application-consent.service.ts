import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import {
  ApplicationConsentDto,
  ConsentTypeValue,
} from '@/modules/auto-apply/types/application-consent.types.js';

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
    return this.repository.grant(userId, consentType);
  }

  async revokeConsent(userId: string, id: string): Promise<ApplicationConsentDto> {
    return this.repository.revoke(userId, id);
  }
}
