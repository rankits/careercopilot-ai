import type {
  CandidateProfileSourcePayload,
  RecommendationFilterMode,
  RecommendationFlexibilityMode,
} from '@/modules/recommendations/types/recommendations.types.js';
import { extractHeuristicTargetContext } from '@/modules/recommendations/providers/heuristic-target-text-extraction.provider.js';

type JsonRecord = Record<string, unknown>;

export interface CareerTargetSourceRecord {
  id: string;
  userId: string;
  goalText: string;
  structured: unknown;
}

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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

const normalizeFlexibilityMode = (value: unknown): RecommendationFlexibilityMode | undefined => {
  const raw = asString(value);
  if (!raw) return undefined;
  const normalized = raw.replace(/[\s-]+/g, '_').toUpperCase();
  if (normalized === 'STRICT' || normalized === 'FLEXIBLE' || normalized === 'STRETCH') {
    return normalized;
  }
  return undefined;
};

const filterModeForFlexibility = (
  flexibilityMode: RecommendationFlexibilityMode,
): RecommendationFilterMode => (flexibilityMode === 'STRICT' ? 'STRICT' : 'FLEXIBLE');

export const buildCareerGoalRecommendationPayload = (
  target: CareerTargetSourceRecord,
  profile: CandidateProfileSourcePayload,
): CandidateProfileSourcePayload => {
  const structured = asRecord(target.structured);
  const goalExtraction = extractHeuristicTargetContext(target.goalText);
  const currentRole = firstString(structured, ['currentRole', 'fromRole']);
  const structuredTargetRole = firstString(structured, ['targetRole', 'desiredRole', 'role']);
  const summary = firstString(structured, ['summary', 'description']);
  const structuredTargetTitles = uniqueStrings(
    [
      structuredTargetRole,
      ...listFromKeys(structured, ['targetTitles', 'targetRoles', 'roles']),
    ].filter((item): item is string => Boolean(item)),
  );
  const targetTitles = uniqueStrings([...structuredTargetTitles, ...goalExtraction.targetTitles]);
  const targetRole = structuredTargetRole ?? targetTitles[0];
  const targetSkills = uniqueStrings([
    ...listFromKeys(structured, ['requiredSkills', 'targetSkills', 'skills']),
    ...goalExtraction.requiredSkills,
  ]);
  const preferredSkills = uniqueStrings(listFromKeys(structured, ['preferredSkills']));
  const targetIndustries = uniqueStrings([
    ...listFromKeys(structured, ['targetIndustries', 'industries', 'preferredIndustries']),
    ...goalExtraction.industries,
  ]);
  const flexibilityMode = normalizeFlexibilityMode(structured.flexibilityMode) ?? 'FLEXIBLE';
  const structuredLocations = listFromKeys(structured, ['locations']);
  const extractedLocations = goalExtraction.locations;
  const structuredRemotePreference = firstString(structured, ['remotePreference', 'workMode']);
  const locationScope = firstString(structured, ['locationScope']);
  const resolveExplicitScope = (): 'ANY' | 'WORK_MODE' | 'GEOGRAPHIC' | 'COMBINED' | undefined => {
    if (locationScope === 'ANY') return 'ANY';
    if (locationScope === 'WORK_MODE') return 'WORK_MODE';
    if (locationScope === 'GEOGRAPHIC') return 'GEOGRAPHIC';
    if (locationScope === 'COMBINED') return 'COMBINED';
    if (structuredLocations.length > 0 && structuredRemotePreference) return 'COMBINED';
    if (structuredLocations.length > 0) return 'GEOGRAPHIC';
    if (structuredRemotePreference) return 'WORK_MODE';
    return undefined;
  };
  const explicitScope = resolveExplicitScope();
  const resolvedLocations =
    explicitScope === 'ANY'
      ? []
      : explicitScope === 'WORK_MODE'
        ? []
        : explicitScope === 'GEOGRAPHIC' || explicitScope === 'COMBINED'
          ? uniqueStrings([...structuredLocations, ...extractedLocations])
          : structuredLocations.length > 0
            ? uniqueStrings([...structuredLocations, ...extractedLocations])
            : uniqueStrings([...extractedLocations, ...(profile.locations ?? [])]);
  const resolvedRemotePreference =
    explicitScope === 'ANY'
      ? undefined
      : explicitScope === 'GEOGRAPHIC'
        ? undefined
        : explicitScope === 'WORK_MODE' || explicitScope === 'COMBINED'
          ? (structuredRemotePreference ?? goalExtraction.remotePreference)
          : (structuredRemotePreference ??
            goalExtraction.remotePreference ??
            profile.remotePreference);

  return {
    ...profile,
    targetTitles: targetTitles.length > 0 ? targetTitles : profile.targetTitles,
    relatedTitles: uniqueStrings([
      ...profile.targetTitles,
      ...(profile.relatedTitles ?? []),
      ...listFromKeys(structured, ['relatedTitles']),
    ]),
    requiredSkills: uniqueStrings([...targetSkills, ...profile.requiredSkills]),
    preferredSkills: uniqueStrings([...preferredSkills, ...(profile.preferredSkills ?? [])]),
    careerLevel: firstString(structured, ['careerLevel', 'seniority']) ?? profile.careerLevel,
    industries: targetIndustries.length > 0 ? targetIndustries : (profile.industries ?? []),
    locations: resolvedLocations,
    remotePreference: resolvedRemotePreference,
    employmentTypes: uniqueStrings([
      ...listFromKeys(structured, ['employmentTypes', 'jobTypes']),
      ...goalExtraction.employmentTypes,
      ...(profile.employmentTypes ?? []),
    ]),
    // Career goals are exploratory: flexibilityMode defaults to FLEXIBLE and must
    // drive filterMode, otherwise profile location preferences hard-exclude matches.
    flexibilityMode,
    filterMode: filterModeForFlexibility(flexibilityMode),
    goalIntent: {
      currentRole,
      targetRole,
      summary: summary ?? target.goalText,
      targetIndustries,
      timeframe: firstString(structured, ['timeframe', 'timeline']),
    },
    currentRole: currentRole ?? profile.currentRole,
    targetRole: targetRole ?? profile.targetRole,
    careerTransitionSummary: summary ?? target.goalText,
    transferableSkillsHint: uniqueStrings(
      listFromKeys(structured, ['transferableSkills', 'transferableSkillsHint']),
    ),
    sourceText: uniqueStrings(
      [target.goalText, profile.sourceText].filter(Boolean) as string[],
    ).join('\n'),
  };
};
