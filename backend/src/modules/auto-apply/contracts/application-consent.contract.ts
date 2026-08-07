import {
  ApplicationConsentDto,
  ConsentTypeValue,
} from '@/modules/auto-apply/types/application-consent.types.js';

export interface IApplicationConsentRepository {
  findManyByUserId(userId: string): Promise<ApplicationConsentDto[]>;
  findActiveByType(
    userId: string,
    consentType: ConsentTypeValue,
  ): Promise<ApplicationConsentDto | null>;
  findById(userId: string, id: string): Promise<ApplicationConsentDto | null>;
  grant(userId: string, consentType: ConsentTypeValue): Promise<ApplicationConsentDto>;
  revoke(userId: string, id: string): Promise<ApplicationConsentDto>;
}
