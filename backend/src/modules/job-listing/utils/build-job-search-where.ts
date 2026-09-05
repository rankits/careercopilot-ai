import { Prisma } from '@prisma/client';
import type { JobSearchFilters } from '@/modules/job-listing/types/job-listing.types.js';
import { expandUsdSalaryBand } from '@/modules/job-listing/utils/salary-currency-conversion.js';

const toList = (value?: string | string[]): string[] => {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
};

const remoteTypesFromLocationQuery = (location: string): string[] => {
  const normalized = location.trim().toLowerCase();
  if (!normalized) return [];
  if (/\bremote\b/.test(normalized)) return ['REMOTE'];
  if (/\bhybrid\b/.test(normalized)) return ['HYBRID'];
  if (/\bon[-\s]?site\b/.test(normalized) || /\bonsite\b/.test(normalized)) return ['ONSITE'];
  return [];
};

const buildSalaryOverlapClause = (minSalary?: number, maxSalary?: number): Prisma.JobWhereInput => {
  // Match bands against the top of the posted range (salaryMax).
  // Overlap-on-salaryMin let $117k jobs into a "$50k–$100k" band, which then
  // looked unsorted under "Salary: High to Low".
  if (minSalary !== undefined && maxSalary !== undefined) {
    return {
      OR: [
        { salaryMax: { gte: minSalary, lte: maxSalary } },
        {
          AND: [{ salaryMax: null }, { salaryMin: { gte: minSalary, lte: maxSalary } }],
        },
      ],
    };
  }
  if (minSalary !== undefined) {
    return {
      OR: [
        { salaryMax: { gte: minSalary } },
        { AND: [{ salaryMax: null }, { salaryMin: { gte: minSalary } }] },
      ],
    };
  }
  if (maxSalary !== undefined) {
    return {
      OR: [
        { salaryMax: { lte: maxSalary } },
        { AND: [{ salaryMax: null }, { salaryMin: { lte: maxSalary } }] },
      ],
    };
  }
  return {};
};

/**
 * Job-feed salary bands are USD annual amounts.
 * Without an explicit `currency`, expand across supported currencies so EUR/INR/etc. match.
 * INR bounds are converted to LPA (storage/display unit).
 */
const buildMultiCurrencySalaryFilter = (
  minSalary?: number,
  maxSalary?: number,
): Prisma.JobWhereInput => ({
  OR: expandUsdSalaryBand({ minSalary, maxSalary }).map((band) => ({
    currency: band.currency,
    ...buildSalaryOverlapClause(band.minSalary, band.maxSalary),
  })),
});

/** Builds Prisma where clause; every accepted filter is applied (no silent ignores). */
export function buildJobSearchWhere(filters: JobSearchFilters): Prisma.JobWhereInput {
  const skills = toList(filters.skills);
  const remoteTypes = toList(filters.remoteTypes);
  const employmentTypes = toList(filters.employmentTypes);
  const location = filters.location?.trim();
  const hasSalaryFilter = filters.minSalary !== undefined || filters.maxSalary !== undefined;

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

  const andClauses: Prisma.JobWhereInput[] = [];
  if (skills.length) {
    andClauses.push(
      ...skills.map((skill) => ({
        skills: { array_contains: [skill] },
      })),
    );
  }

  if (hasSalaryFilter && !filters.currency) {
    andClauses.push(buildMultiCurrencySalaryFilter(filters.minSalary, filters.maxSalary));
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
    ...(filters.currency
      ? {
          currency: filters.currency.toUpperCase(),
          ...(hasSalaryFilter
            ? buildSalaryOverlapClause(filters.minSalary, filters.maxSalary)
            : {}),
        }
      : {}),
    ...(filters.postedSince !== undefined && {
      effectivePostedAt: { gte: filters.postedSince },
    }),
    ...(locationClauses.length && { OR: locationClauses }),
    ...(andClauses.length ? { AND: andClauses } : {}),
  };
}
