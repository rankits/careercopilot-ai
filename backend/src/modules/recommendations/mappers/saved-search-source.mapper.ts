import type { CandidateProfileSourcePayload } from '@/modules/recommendations/types/recommendations.types.js';

type JsonRecord = Record<string, unknown>;

export interface SavedSearchSourceRecord {
  id: string;
  userId: string;
  name: string;
  query: string | null;
  filters: unknown;
  context: unknown;
  updatedAt: Date;
}

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asStringList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return asString(item);
      const record = asRecord(item);
      return asString(record.name) ?? asString(record.label) ?? asString(record.value);
    })
    .filter((item): item is string => Boolean(item));
};

const uniqueStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

const firstString = (record: JsonRecord, keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
};

const listFromKeys = (record: JsonRecord, keys: readonly string[]): string[] =>
  keys.flatMap((key) => asStringList(record[key]));

const firstNumber = (record: JsonRecord, keys: readonly string[]): number | undefined => {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

export const buildSavedSearchRecommendationPayload = (
  savedSearch: SavedSearchSourceRecord,
): CandidateProfileSourcePayload => {
  const filters = asRecord(savedSearch.filters);
  const context = asRecord(savedSearch.context);
  const titles = uniqueStrings([
    ...listFromKeys(context, ['targetTitles', 'titles']),
    ...listFromKeys(filters, ['titles', 'roles']),
  ]);
  const locations = uniqueStrings([
    ...listFromKeys(context, ['locations']),
    ...listFromKeys(filters, ['locations']),
  ]);
  const employmentTypes = uniqueStrings([
    ...listFromKeys(context, ['employmentTypes']),
    ...listFromKeys(filters, ['employmentTypes', 'jobTypes']),
  ]);
  const industries = uniqueStrings([
    ...listFromKeys(context, ['industries']),
    ...listFromKeys(filters, ['industries']),
  ]);
  const remotePreference =
    firstString(context, ['remotePreference']) ??
    firstString(filters, ['remotePreference', 'workMode']) ??
    asStringList(filters.workModes)[0];
  const minimumSalary = firstNumber(filters, ['minimumSalary', 'salaryMin', 'minSalary']);
  const maximumSalary = firstNumber(filters, ['maximumSalary', 'salaryMax', 'maxSalary']);
  const currency = firstString(filters, ['currency', 'salaryCurrency'])?.toUpperCase();
  const criteriaVersion = savedSearch.updatedAt.toISOString();
  const query = asString(savedSearch.query) ?? undefined;

  return {
    targetTitles: titles,
    relatedTitles: uniqueStrings(listFromKeys(context, ['relatedTitles'])),
    requiredSkills: uniqueStrings([
      ...listFromKeys(context, ['requiredSkills', 'skills']),
      ...listFromKeys(filters, ['skills']),
    ]),
    preferredSkills: uniqueStrings(listFromKeys(context, ['preferredSkills'])),
    industries,
    locations,
    remotePreference,
    employmentTypes,
    salaryExpectation: {
      minimum: minimumSalary,
      maximum: maximumSalary,
      currency,
    },
    savedSearchCriteriaVersion: criteriaVersion,
    savedSearchSnapshot: {
      searchId: savedSearch.id,
      criteriaVersion,
      query,
      filters: {
        titles,
        locations,
        remotePreference,
        employmentTypes,
        industries,
        minimumSalary,
        maximumSalary,
        currency,
      },
    },
    sourceText: uniqueStrings([savedSearch.name, query].filter(Boolean) as string[]).join('\n'),
  };
};
