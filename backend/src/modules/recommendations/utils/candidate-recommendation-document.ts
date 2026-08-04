import type { CandidateProfileSourceInput } from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
import {
  hasRecommendationSignal,
  toCandidateProfileSourcePayload,
} from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
import type { CandidateProfileSourcePayload } from '@/modules/recommendations/types/recommendations.types.js';

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const mergeStringLists = (primary: readonly string[], fallback: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of [...primary, ...fallback]) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

const pickPrimaryString = (
  primary: string | undefined,
  fallback: string | undefined,
): string | undefined => {
  const primaryTrimmed = primary?.trim();
  if (primaryTrimmed) return primaryTrimmed;
  const fallbackTrimmed = fallback?.trim();
  return fallbackTrimmed || undefined;
};

const pickPrimaryNumber = (
  primary: number | undefined,
  fallback: number | undefined,
): number | undefined =>
  typeof primary === 'number' && Number.isFinite(primary) ? primary : fallback;

/**
 * Merges candidate profile and resume-parse inputs with PROFILE-primary precedence.
 * Profile fields win when present; resume fills gaps only.
 */
export const mergeCandidateProfileSources = (
  profile: CandidateProfileSourceInput,
  resume?: CandidateProfileSourceInput | null,
): CandidateProfileSourceInput => {
  if (!resume) return profile;

  const profileSkills = asStringList(profile.skills);
  const resumeSkills = asStringList(resume.skills);

  return {
    personalDetails: {
      ...(typeof resume.personalDetails === 'object' && resume.personalDetails !== null
        ? (resume.personalDetails as Record<string, unknown>)
        : {}),
      ...(typeof profile.personalDetails === 'object' && profile.personalDetails !== null
        ? (profile.personalDetails as Record<string, unknown>)
        : {}),
    },
    professionalProfile: profile.professionalProfile ?? resume.professionalProfile,
    professionalLabels: profile.professionalLabels ?? resume.professionalLabels,
    experience:
      Array.isArray(profile.experience) && profile.experience.length > 0
        ? profile.experience
        : resume.experience,
    education:
      Array.isArray(profile.education) && profile.education.length > 0
        ? profile.education
        : resume.education,
    skills: mergeStringLists(profileSkills, resumeSkills),
    certifications:
      Array.isArray(profile.certifications) && profile.certifications.length > 0
        ? profile.certifications
        : resume.certifications,
    languages:
      Array.isArray(profile.languages) && profile.languages.length > 0
        ? profile.languages
        : resume.languages,
    totalExperienceYears: pickPrimaryNumber(
      typeof profile.totalExperienceYears === 'number' ? profile.totalExperienceYears : undefined,
      typeof resume.totalExperienceYears === 'number' ? resume.totalExperienceYears : undefined,
    ),
  };
};

/** Builds the normalized recommendation payload from merged candidate document input. */
export const buildCandidateRecommendationDocument = (
  input: CandidateProfileSourceInput,
): CandidateProfileSourcePayload => toCandidateProfileSourcePayload(input);

export const buildProfilePrimaryRecommendationPayload = (
  profile: CandidateProfileSourceInput,
  resumeFallback?: CandidateProfileSourceInput | null,
): CandidateProfileSourcePayload => {
  const merged = mergeCandidateProfileSources(profile, resumeFallback);
  const payload = buildCandidateRecommendationDocument(merged);
  if (!hasRecommendationSignal(payload)) {
    return payload;
  }
  return payload;
};

export const pickPrimarySummary = (
  profile: CandidateProfileSourceInput,
  resume?: CandidateProfileSourceInput | null,
): string | undefined => {
  const profileRecord =
    typeof profile.personalDetails === 'object' && profile.personalDetails !== null
      ? (profile.personalDetails as Record<string, unknown>)
      : {};
  const resumeRecord =
    resume && typeof resume.personalDetails === 'object' && resume.personalDetails !== null
      ? (resume.personalDetails as Record<string, unknown>)
      : {};
  return pickPrimaryString(
    typeof profileRecord.summary === 'string'
      ? profileRecord.summary
      : typeof profileRecord.professionalSummary === 'string'
        ? profileRecord.professionalSummary
        : undefined,
    typeof resumeRecord.summary === 'string'
      ? resumeRecord.summary
      : typeof resumeRecord.professionalSummary === 'string'
        ? resumeRecord.professionalSummary
        : undefined,
  );
};
