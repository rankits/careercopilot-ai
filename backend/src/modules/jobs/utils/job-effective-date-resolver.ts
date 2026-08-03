import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';

export interface JobEffectiveDateInput {
  normalizedJob?: NormalizedJob;
  providerMetadata?: unknown;
  firstSeen?: Date;
  createdAt?: Date;
}

export function resolveJobEffectiveDate(input: JobEffectiveDateInput): Date | null {
  // 1. Provider metadata (highest priority if provider provided openingDate / publicationDate)
  if (
    input.providerMetadata &&
    typeof input.providerMetadata === 'object' &&
    !Array.isArray(input.providerMetadata)
  ) {
    const metadata = input.providerMetadata as Record<string, unknown>;
    const providerDateStr = metadata.openingDate ?? metadata.publicationDate;
    if (typeof providerDateStr === 'string' || typeof providerDateStr === 'number') {
      const parsed = new Date(providerDateStr);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // 2. NormalizedJob postedAt
  if (input.normalizedJob?.postedAt) {
    const parsed = new Date(input.normalizedJob.postedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 3. firstSeen (from DB)
  if (input.firstSeen) {
    return input.firstSeen;
  }

  // 4. createdAt (from DB)
  if (input.createdAt) {
    return input.createdAt;
  }

  return null;
}
