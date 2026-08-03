import type {
  CandidateProfileSourcePayload,
  WorkAuthorizationStatus,
} from '@/modules/recommendations/types/recommendations.types.js';

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[^\d.-]/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return undefined;
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
      return asString(record.label) || asString(record.name) || asString(record.value);
    })
    .filter((item): item is string => Boolean(item));
};

const uniqueStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
};

const educationLines = (education: unknown): string[] =>
  asArray(education)
    .map((entry) => {
      const record = asRecord(entry);
      const composed = [asString(record.qualification), asString(record.fieldOfStudy)]
        .filter(Boolean)
        .join(' ');
      return (
        composed ||
        asString(record.raw) ||
        asString(record.description) ||
        asString(record.institution)
      );
    })
    .filter((line): line is string => Boolean(line));

const certificationNames = (certifications: unknown): string[] =>
  asArray(certifications)
    .map((entry) => {
      const record = asRecord(entry);
      return asString(record.name) || asString(record.raw) || asString(record.description);
    })
    .filter((name): name is string => Boolean(name));

const experienceTitles = (experience: unknown): string[] =>
  asArray(experience)
    .map((entry) => {
      const record = asRecord(entry);
      return asString(record.title) || asString(record.designation) || asString(record.role);
    })
    .filter((title): title is string => Boolean(title));

const locationFromPersonalDetails = (personalDetails: JsonRecord): string[] => {
  const location = personalDetails.location;
  if (typeof location === 'string') {
    const value = asString(location);
    return value ? [value] : [];
  }
  const record = asRecord(location);
  const composed = [asString(record.city), asString(record.state), asString(record.country)]
    .filter(Boolean)
    .join(', ');
  return composed ? [composed] : [];
};

const listFromRecords = (records: readonly JsonRecord[], category: string): string[] =>
  records
    .filter((record) => asString(record.category)?.toUpperCase() === category)
    .map((record) => asString(record.label))
    .filter((label): label is string => Boolean(label));

const stringListFromRecord = (record: JsonRecord, keys: readonly string[]): string[] =>
  keys.flatMap((key) => asStringList(record[key]));

const normalizeToken = (value: string): string => value.trim().replace(/[\s-]+/g, '_').toUpperCase();

const normalizeRemotePreference = (value: unknown): string | undefined => {
  const raw = asString(value);
  if (!raw) return undefined;
  const normalized = normalizeToken(raw);
  if (['REMOTE', 'HYBRID', 'ONSITE', 'ON_SITE', 'ANY'].includes(normalized)) {
    return normalized === 'ON_SITE' ? 'ONSITE' : normalized;
  }
  return raw;
};

const normalizeWorkAuthorization = (value: unknown): WorkAuthorizationStatus | undefined => {
  const raw = asString(value);
  if (!raw) return undefined;
  const normalized = normalizeToken(raw);
  if (normalized === 'AUTHORIZED' || normalized === 'NOT_APPLICABLE') return normalized;
  if (normalized === 'NEEDS_SPONSORSHIP' || normalized === 'SPONSORSHIP_REQUIRED') {
    return 'NEEDS_SPONSORSHIP';
  }
  if (normalized === 'UNKNOWN') return 'UNKNOWN';
  return undefined;
};

const salaryExpectationFrom = (
  personalDetails: JsonRecord,
  professionalProfile: JsonRecord,
): CandidateProfileSourcePayload['salaryExpectation'] => {
  const salaryRecord = {
    ...asRecord(professionalProfile.salaryExpectation),
    ...asRecord(professionalProfile.expectedSalary),
    ...asRecord(personalDetails.salaryExpectation),
    ...asRecord(personalDetails.expectedSalary),
  };
  return {
    minimum:
      asNumber(salaryRecord.minimum) ??
      asNumber(salaryRecord.min) ??
      asNumber(personalDetails.salaryMin) ??
      asNumber(personalDetails.minimumSalary),
    maximum:
      asNumber(salaryRecord.maximum) ??
      asNumber(salaryRecord.max) ??
      asNumber(personalDetails.salaryMax) ??
      asNumber(personalDetails.maximumSalary),
    currency:
      asString(salaryRecord.currency)?.toUpperCase() ||
      asString(personalDetails.salaryCurrency)?.toUpperCase() ||
      asString(personalDetails.currency)?.toUpperCase(),
  };
};

const sourceTextFrom = (
  personalDetails: JsonRecord,
  professionalProfile: JsonRecord,
): string | undefined => {
  const lines = [
    asString(personalDetails.summary),
    asString(personalDetails.professionalSummary),
    asString(professionalProfile.summary),
    asString(professionalProfile.headline),
    ...asArray(personalDetails.projects)
      .map((project) => {
        const record = asRecord(project);
        return [asString(record.name), asString(record.description)].filter(Boolean).join(' ');
      })
      .filter(Boolean),
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join('\n') : undefined;
};

export interface CandidateProfileSourceInput {
  personalDetails?: unknown;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  certifications?: unknown;
  totalExperienceYears?: unknown;
  professionalProfile?: unknown;
  professionalLabels?: unknown;
  languages?: unknown;
  sourceResumeId?: string | null;
}

/**
 * Maps stored candidate/resume JSON (CandidateProfile or ParsedResumeData) into
 * the recommendation profile payload. Does not invent missing titles or skills.
 */
export const toCandidateProfileSourcePayload = (
  input: CandidateProfileSourceInput,
): CandidateProfileSourcePayload => {
  const personalDetails = asRecord(input.personalDetails);
  const professionalProfile = asRecord(input.professionalProfile);
  const professionalLabels = asArray(input.professionalLabels).map(asRecord);
  const skills = asStringList(input.skills);
  const targetTitles = uniqueStrings(
    [
      asString(personalDetails.currentTitle),
      asString(personalDetails.designation),
      asString(personalDetails.primaryRole),
      asString(personalDetails.title),
      asString(professionalProfile.primaryRole),
      asString(professionalProfile.currentTitle),
      asString(professionalProfile.headline),
      ...experienceTitles(input.experience),
    ].filter((title): title is string => Boolean(title)),
  );

  const relatedTitles = uniqueStrings([
    ...stringListFromRecord(personalDetails, ['preferredRoles', 'targetRoles', 'desiredRoles']),
    ...stringListFromRecord(professionalProfile, ['preferredRoles', 'targetRoles']),
    ...professionalLabels
      .map((label) => {
        const category = asString(label.category)?.toUpperCase();
        if (category && category !== 'ROLE' && category !== 'SPECIALISATION') return undefined;
        return asString(label.label);
      })
      .filter((label): label is string => Boolean(label)),
  ]);

  const years =
    typeof input.totalExperienceYears === 'number' && Number.isFinite(input.totalExperienceYears)
      ? input.totalExperienceYears
      : asNumber(personalDetails.totalExperience) ??
        asNumber(personalDetails.totalExperienceYears) ??
        asNumber(professionalProfile.totalExperienceYears);
  const remotePreference =
    normalizeRemotePreference(personalDetails.remotePreference) ??
    normalizeRemotePreference(personalDetails.workMode) ??
    normalizeRemotePreference(personalDetails.preferredWorkMode);
  const requiresSponsorship = asBoolean(personalDetails.requiresSponsorship);

  return {
    targetTitles,
    relatedTitles,
    requiredSkills: uniqueStrings(skills),
    preferredSkills: uniqueStrings([
      ...stringListFromRecord(personalDetails, ['preferredSkills', 'targetSkills']),
      ...stringListFromRecord(professionalProfile, ['preferredSkills', 'targetSkills']),
      ...listFromRecords(professionalLabels, 'TECH_STACK'),
    ]),
    yearsOfExperience: years,
    minimumExperience: asNumber(personalDetails.minimumExperience),
    maximumExperience: asNumber(personalDetails.maximumExperience),
    seniority:
      asString(personalDetails.seniorityLevel) || asString(professionalProfile.seniorityLevel),
    careerLevel:
      asString(personalDetails.careerLevel) ||
      asString(personalDetails.seniorityLevel) ||
      asString(professionalProfile.seniorityLevel),
    industries: uniqueStrings([
      ...stringListFromRecord(personalDetails, ['industries', 'preferredIndustries']),
      ...stringListFromRecord(professionalProfile, ['industries', 'preferredIndustries']),
      ...listFromRecords(professionalLabels, 'DOMAIN'),
    ]),
    locations: uniqueStrings([
      ...locationFromPersonalDetails(personalDetails),
      ...stringListFromRecord(personalDetails, ['locations', 'preferredLocations']),
    ]),
    eligibleCountries: stringListFromRecord(personalDetails, ['eligibleCountries']),
    remotePreference,
    employmentTypes: uniqueStrings(
      stringListFromRecord(personalDetails, [
        'employmentTypes',
        'preferredEmploymentTypes',
        'jobTypes',
      ]).map(normalizeToken),
    ),
    salaryExpectation: salaryExpectationFrom(personalDetails, professionalProfile),
    salaryMinimumNonNegotiable: asNumber(personalDetails.salaryMinimumNonNegotiable),
    education: educationLines(input.education),
    certifications: certificationNames(input.certifications),
    excludedCompanies: uniqueStrings(
      stringListFromRecord(personalDetails, ['excludedCompanies', 'avoidCompanies']),
    ),
    excludedSkills: uniqueStrings(
      stringListFromRecord(personalDetails, ['excludedSkills', 'avoidSkills']),
    ),
    workAuthorization: normalizeWorkAuthorization(personalDetails.workAuthorization),
    requiresSponsorship,
    languages: uniqueStrings([
      ...asStringList(input.languages),
      ...stringListFromRecord(personalDetails, ['languages']),
    ]),
    sourceText: sourceTextFrom(personalDetails, professionalProfile),
  };
};

export const hasRecommendationSignal = (payload: CandidateProfileSourcePayload): boolean =>
  payload.targetTitles.length > 0 ||
  payload.requiredSkills.length > 0 ||
  Boolean(payload.sourceText);
