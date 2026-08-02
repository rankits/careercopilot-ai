import { Prisma } from '@prisma/client';
import type { JobSearchFilters } from '@/modules/job-listing/types/job-listing.types.js';

const toList = (value?: string | string[]): string[] => {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => item.trim())
    .filter(Boolean);
};

const remoteTypesFromLocationQuery = (location: string): string[] => {
  const normalized = location.trim().toLowerCase();
  if (!normalized) return [];
  if (/\bremote\b/.test(normalized)) return ['REMOTE'];
  if (/\bhybrid\b/.test(normalized)) return ['HYBRID'];
  if (/\bon[-\s]?site\b/.test(normalized) || /\bonsite\b/.test(normalized)) return ['ONSITE'];
  return [];
};

/** Builds Prisma where clause; every accepted filter is applied (no silent ignores). */
export function buildJobSearchWhere(filters: JobSearchFilters): Prisma.JobWhereInput {
  const skills = toList(filters.skills);
  const remoteTypes = toList(filters.remoteTypes);
  const employmentTypes = toList(filters.employmentTypes);
  const location = filters.location?.trim();

  const locationClauses: Prisma.JobWhereInput[] = [];
  if (location) {
    locationClauses.push(
      {
        providerMetadata: {
          path: ['locationRaw'],
          string_contains: location,
        },
      },
      {
        providerMetadata: {
          path: ['locationCity'],
          string_contains: location,
        },
      },
      {
        providerMetadata: {
          path: ['locationCountry'],
          string_contains: location,
        },
      },
      {
        descriptionText: { contains: location, mode: 'insensitive' },
      },
    );
    const inferredRemote = remoteTypesFromLocationQuery(location);
    if (inferredRemote.length) {
      locationClauses.push({ remoteType: { in: inferredRemote } });
    }
  }

  return {
    status: 'ACTIVE',
    ...(filters.query && {
      OR: [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { descriptionText: { contains: filters.query, mode: 'insensitive' } },
        { company: { name: { contains: filters.query, mode: 'insensitive' } } },
      ],
    }),
    ...(filters.companySlug && { companySlug: filters.companySlug }),
    ...(remoteTypes.length && { remoteType: { in: remoteTypes } }),
    ...(employmentTypes.length && { employmentType: { in: employmentTypes } }),
    ...(skills.length && {
      AND: skills.map((skill) => ({
        skills: { array_contains: [skill] },
      })),
    }),
    ...(filters.minSalary !== undefined && {
      salaryMax: { gte: filters.minSalary },
    }),
    ...(filters.maxSalary !== undefined && {
      salaryMin: { lte: filters.maxSalary },
    }),
    ...(filters.postedSince !== undefined && {
      effectivePostedAt: { gte: filters.postedSince },
    }),
    ...(locationClauses.length && { OR: locationClauses }),
  };
}
