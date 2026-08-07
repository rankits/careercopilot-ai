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
  remotePreferences: [],
  remotePreference: 'ANY',
};

function normalizePreferences(raw: unknown): CandidateApplicationPreferences {
  const prefs = (raw as Partial<CandidateApplicationPreferences>) ?? {};
  const remotePreferences =
    prefs.remotePreferences && prefs.remotePreferences.length > 0
      ? prefs.remotePreferences
      : prefs.remotePreference && prefs.remotePreference !== 'ANY'
        ? [prefs.remotePreference]
        : prefs.remotePreference === 'ANY'
          ? (['REMOTE', 'HYBRID', 'ONSITE'] as const).slice()
          : [];

  return {
    ...DEFAULT_PREFERENCES,
    ...prefs,
    remotePreferences: [...remotePreferences],
    remotePreference:
      remotePreferences.length === 0 || remotePreferences.length >= 3
        ? 'ANY'
        : remotePreferences[0],
  };
}

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
    preferences: normalizePreferences(record.preferences),
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

    if (
      input.preferences &&
      'requiresSponsorship' in input.preferences &&
      input.preferences.requiresSponsorship == null
    ) {
      delete (nextPreferences as Partial<CandidateApplicationPreferences>).requiresSponsorship;
    }

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
