import type {
  RecommendationSourceLoader,
  ResumeProfileSourceLookup,
} from '@/modules/recommendations/contracts/recommendation-source-loader.js';
import type { CandidateProfileSourceInput } from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';
import type { ParsedResumeData } from '@/modules/resumes/types/resume.types.js';

const COMPLETE_PARSE_STATUSES = new Set(['COMPLETED', 'NEEDS_REVIEW']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const asRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const joinLocation = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined;
  const record = asRecord(value);
  const composed = ['city', 'state', 'country']
    .map((key) => (typeof record[key] === 'string' ? record[key].trim() : ''))
    .filter(Boolean)
    .join(', ');
  return composed || undefined;
};

const flattenSkills = (value: unknown): string[] => {
  if (Array.isArray(value)) return asStringArray(value);
  const record = asRecord(value);
  return ['technical', 'tools', 'frameworks', 'softSkills', 'domains'].flatMap((key) =>
    asStringArray(record[key]),
  );
};

const asParsedResumeData = (value: unknown): ParsedResumeData | null => {
  if (!isRecord(value)) return null;
  const record = value;
  const personalInformation = asRecord(record.personalInformation);
  const currentPosition = asRecord(record.currentPosition);
  const professionalProfile = isRecord(record.professionalProfile)
    ? record.professionalProfile
    : undefined;
  const canonicalLocation = joinLocation(personalInformation.location);
  const personalDetails = isRecord(record.personalDetails)
    ? record.personalDetails
    : {
        currentTitle:
          typeof currentPosition.title === 'string'
            ? currentPosition.title
            : professionalProfile?.currentTitle,
        location: canonicalLocation,
        primaryRole: professionalProfile?.primaryRole,
        seniorityLevel: professionalProfile?.seniorityLevel,
        summary:
          typeof record.professionalSummary === 'string'
            ? record.professionalSummary
            : professionalProfile?.summary,
      };
  const experience = asRecordArray(record.experience).length
    ? asRecordArray(record.experience)
    : asRecordArray(record.employmentHistory);

  return {
    personalDetails,
    professionalProfile,
    professionalLabels: asRecordArray(record.professionalLabels).length
      ? asRecordArray(record.professionalLabels)
      : undefined,
    experience,
    projects: asRecordArray(record.projects).length ? asRecordArray(record.projects) : undefined,
    education: asRecordArray(record.education),
    skills: flattenSkills(record.skills),
    certifications: asRecordArray(record.certifications),
    languages: asRecordArray(record.languages).length ? asRecordArray(record.languages) : undefined,
    totalExperienceMonths:
      typeof record.totalExperienceMonths === 'number' ? record.totalExperienceMonths : undefined,
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
): RecommendationSourceLoader => {
  const lookupOwnedResumeProfileSource = async (
    userId: string,
    resumeId: string,
  ): Promise<ResumeProfileSourceLookup> => {
    const resume = await repository.findResumeById(resumeId);
    if (!resume || !resume.userId || resume.userId !== userId) return { status: 'NOT_FOUND' };

    const parseRun = await repository.findLatestParseRun(resumeId);
    if (!parseRun || !COMPLETE_PARSE_STATUSES.has(parseRun.status)) {
      return { status: 'INCOMPLETE', reason: 'PARSE_NOT_READY' };
    }

    const parsed =
      asParsedResumeData(parseRun.parsedData) ??
      asParsedResumeData(parseRun.extraction?.extractedData);
    if (!parsed) return { status: 'INCOMPLETE', reason: 'PARSE_DATA_MISSING' };
    return { status: 'FOUND', payload: toSourceInput(parsed) };
  };

  return {
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

    lookupOwnedResumeProfileSource,

    async findOwnedResumeProfileSource(userId, resumeId) {
      const lookup = await lookupOwnedResumeProfileSource(userId, resumeId);
      return lookup.status === 'FOUND' ? lookup.payload : null;
    },
  };
};
