import type { RecommendationSourceLoader } from '@/modules/recommendations/contracts/recommendation-source-loader.js';
import type { CandidateProfileSourceInput } from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';
import type { ParsedResumeData } from '@/modules/resumes/types/resume.types.js';

const COMPLETE_PARSE_STATUSES = new Set(['COMPLETED', 'NEEDS_REVIEW']);

const asParsedResumeData = (value: unknown): ParsedResumeData | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    personalDetails: (record.personalDetails as Record<string, unknown>) ?? {},
    professionalProfile: record.professionalProfile as Record<string, unknown> | undefined,
    professionalLabels: record.professionalLabels as Array<Record<string, unknown>> | undefined,
    experience: Array.isArray(record.experience)
      ? (record.experience as Array<Record<string, unknown>>)
      : [],
    education: Array.isArray(record.education)
      ? (record.education as Array<Record<string, unknown>>)
      : [],
    skills: Array.isArray(record.skills) ? (record.skills as string[]) : [],
    certifications: Array.isArray(record.certifications)
      ? (record.certifications as Array<Record<string, unknown>>)
      : [],
    languages: Array.isArray(record.languages)
      ? (record.languages as Array<Record<string, unknown>>)
      : undefined,
    totalExperienceYears:
      typeof record.totalExperienceYears === 'number' ? record.totalExperienceYears : undefined,
  };
};

const toSourceInput = (parsed: ParsedResumeData): CandidateProfileSourceInput => ({
  personalDetails: parsed.personalDetails,
  professionalProfile: parsed.professionalProfile,
  professionalLabels: parsed.professionalLabels,
  experience: parsed.experience,
  education: parsed.education,
  skills: parsed.skills,
  certifications: parsed.certifications,
  languages: parsed.languages,
  totalExperienceYears: parsed.totalExperienceYears,
});

export const createResumeRecommendationSourceLoader = (
  repository: typeof resumeRepository = resumeRepository,
): RecommendationSourceLoader => ({
  async findCandidateProfileByUserId(userId) {
    const profile = await repository.findCandidateProfileByUserId(userId);
    if (!profile) return null;
    return {
      personalDetails: profile.personalDetails,
      experience: profile.experience,
      education: profile.education,
      skills: profile.skills,
      certifications: profile.certifications,
      sourceResumeId: profile.sourceResumeId,
    };
  },

  async findOwnedResumeProfileSource(userId, resumeId) {
    const resume = await repository.findResumeById(resumeId);
    if (!resume || !resume.userId || resume.userId !== userId) return null;

    const parseRun = await repository.findLatestParseRun(resumeId);
    if (!parseRun || !COMPLETE_PARSE_STATUSES.has(parseRun.status)) return null;

    const parsed =
      asParsedResumeData(parseRun.parsedData) ??
      asParsedResumeData(parseRun.extraction?.extractedData);
    if (!parsed) return null;
    return toSourceInput(parsed);
  },
});
