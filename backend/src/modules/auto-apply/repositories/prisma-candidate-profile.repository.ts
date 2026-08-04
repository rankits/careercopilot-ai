import { prisma } from '@/shared/config/db.conf.js';
import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import {
  CandidateApplicationProfileDto,
  CandidateApplicationPreferences,
  CandidateApplicationLinks,
  CandidateApplicationVerification,
} from '@/modules/auto-apply/types/candidate-profile.types.js';
import { UpsertCandidateApplicationProfileInput } from '@/modules/auto-apply/validations/candidate-profile.validation.js';

const DEFAULT_PREFERENCES: CandidateApplicationPreferences = {
  desiredRoles: [],
  preferredLocations: [],
  remotePreference: 'ANY',
};

function toDto(record: {
  id: string;
  userId: string;
  preferences: unknown;
  links: unknown;
  verification: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CandidateApplicationProfileDto {
  return {
    id: record.id,
    userId: record.userId,
    preferences: (record.preferences as CandidateApplicationPreferences) ?? DEFAULT_PREFERENCES,
    links: (record.links as CandidateApplicationLinks) ?? {},
    verification: (record.verification as CandidateApplicationVerification) ?? {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaCandidateApplicationProfileRepository implements ICandidateApplicationProfileRepository {
  async findByUserId(userId: string): Promise<CandidateApplicationProfileDto | null> {
    const record = await prisma.candidateApplicationProfile.findUnique({ where: { userId } });
    return record ? toDto(record) : null;
  }

  async upsert(
    userId: string,
    input: UpsertCandidateApplicationProfileInput,
  ): Promise<CandidateApplicationProfileDto> {
    const existing = await prisma.candidateApplicationProfile.findUnique({ where: { userId } });

    const nextPreferences = input.preferences
      ? { ...DEFAULT_PREFERENCES, ...(existing?.preferences as object), ...input.preferences }
      : ((existing?.preferences as object) ?? DEFAULT_PREFERENCES);

    const nextLinks = input.links
      ? { ...(existing?.links as object), ...input.links }
      : ((existing?.links as object) ?? {});

    const record = await prisma.candidateApplicationProfile.upsert({
      where: { userId },
      create: {
        userId,
        preferences: nextPreferences,
        links: nextLinks,
        verification: {},
      },
      update: {
        preferences: nextPreferences,
        links: nextLinks,
      },
    });

    return toDto(record);
  }
}
