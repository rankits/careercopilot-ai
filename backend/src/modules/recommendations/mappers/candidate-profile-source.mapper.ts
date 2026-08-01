import type { CandidateProfileSourcePayload } from '@/modules/recommendations/types/recommendations.types.js';

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
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
      return composed || asString(record.raw) || asString(record.institution);
    })
    .filter((line): line is string => Boolean(line));

const certificationNames = (certifications: unknown): string[] =>
  asArray(certifications)
    .map((entry) => {
      const record = asRecord(entry);
      return asString(record.name) || asString(record.raw);
    })
    .filter((name): name is string => Boolean(name));

const experienceTitles = (experience: unknown): string[] =>
  asArray(experience)
    .map((entry) => asString(asRecord(entry).title))
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

export interface CandidateProfileSourceInput {
  personalDetails?: unknown;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  certifications?: unknown;
  totalExperienceYears?: unknown;
  professionalProfile?: unknown;
  professionalLabels?: unknown;
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
  const skills = asStringList(input.skills);
  const targetTitles = uniqueStrings(
    [
      asString(personalDetails.currentTitle),
      asString(personalDetails.primaryRole),
      asString(personalDetails.title),
      asString(professionalProfile.primaryRole),
      asString(professionalProfile.currentTitle),
      ...experienceTitles(input.experience),
    ].filter((title): title is string => Boolean(title)),
  );

  const relatedTitles = uniqueStrings(
    asArray(input.professionalLabels)
      .map((label) => {
        const record = asRecord(label);
        const category = asString(record.category)?.toUpperCase();
        if (category && category !== 'ROLE' && category !== 'SPECIALISATION') return undefined;
        return asString(record.label);
      })
      .filter((label): label is string => Boolean(label)),
  );

  const years =
    typeof input.totalExperienceYears === 'number' && Number.isFinite(input.totalExperienceYears)
      ? input.totalExperienceYears
      : undefined;

  return {
    targetTitles,
    relatedTitles,
    requiredSkills: uniqueStrings(skills),
    preferredSkills: [],
    yearsOfExperience: years,
    seniority:
      asString(personalDetails.seniorityLevel) || asString(professionalProfile.seniorityLevel),
    industries: [],
    locations: locationFromPersonalDetails(personalDetails),
    employmentTypes: [],
    salaryExpectation: {},
    education: educationLines(input.education),
    certifications: certificationNames(input.certifications),
    excludedCompanies: [],
    excludedSkills: [],
    sourceText: asString(personalDetails.summary) || asString(personalDetails.professionalSummary),
  };
};

export const hasRecommendationSignal = (payload: CandidateProfileSourcePayload): boolean =>
  payload.targetTitles.length > 0 ||
  payload.requiredSkills.length > 0 ||
  Boolean(payload.sourceText);
