import { prisma } from '@/shared/config/db.conf.js';
import { PrivacyAcknowledgementDto } from '@/modules/auto-apply/types/privacy-acknowledgement.types.js';
import { PrivacyAcknowledgementInput } from '@/modules/auto-apply/validations/privacy-acknowledgement.validation.js';

const PRIVACY_VERIFICATION_KEY = 'privacyPolicy';

type VerificationRecord = Record<string, unknown>;

function readPrivacyAcknowledgement(verification: unknown): PrivacyAcknowledgementDto | null {
  if (!verification || typeof verification !== 'object') return null;
  const entry = (verification as VerificationRecord)[PRIVACY_VERIFICATION_KEY];
  if (!entry || typeof entry !== 'object') return null;
  const version = (entry as VerificationRecord).version;
  const acknowledgedAt = (entry as VerificationRecord).acknowledgedAt;
  if (typeof version !== 'string' || typeof acknowledgedAt !== 'string') return null;
  return { policyVersion: version, acknowledgedAt };
}

export class PrivacyAcknowledgementService {
  async getAcknowledgement(userId: string): Promise<PrivacyAcknowledgementDto | null> {
    const profile = await prisma.candidateApplicationProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    return readPrivacyAcknowledgement(profile.verification);
  }

  async acknowledge(
    userId: string,
    input: PrivacyAcknowledgementInput,
  ): Promise<PrivacyAcknowledgementDto> {
    const existing = await this.getAcknowledgement(userId);
    if (existing?.policyVersion === input.policyVersion) {
      return existing;
    }

    const acknowledgedAt = new Date().toISOString();
    const nextVerificationEntry = {
      version: input.policyVersion,
      acknowledgedAt,
    };

    const profile = await prisma.candidateApplicationProfile.findUnique({ where: { userId } });
    const currentVerification =
      profile?.verification && typeof profile.verification === 'object'
        ? (profile.verification as VerificationRecord)
        : {};

    await prisma.candidateApplicationProfile.upsert({
      where: { userId },
      create: {
        userId,
        verification: {
          ...currentVerification,
          [PRIVACY_VERIFICATION_KEY]: nextVerificationEntry,
        },
      },
      update: {
        verification: {
          ...currentVerification,
          [PRIVACY_VERIFICATION_KEY]: nextVerificationEntry,
        },
      },
    });

    return { policyVersion: input.policyVersion, acknowledgedAt };
  }
}

export function hasPrivacyAcknowledgement(verification: unknown): boolean {
  return readPrivacyAcknowledgement(verification) !== null;
}

export { readPrivacyAcknowledgement };
