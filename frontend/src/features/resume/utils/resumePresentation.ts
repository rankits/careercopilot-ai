import type {
  ResumeParserMetadata,
  ResumeProfileFormValues,
} from '@/features/resume/types/resume.types';
import { collectParsedSkills } from '@/features/resume/utils/collectParsedSkills';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const records = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export interface ResumePresentation {
  confidenceScore: number | null;
  counts: {
    certifications: number;
    companies: number;
    education: number;
    projects: number;
    skills: number;
  };
  insights: {
    areasToImprove: string[];
    missingInformation: string[];
    suggestions: string[];
    strengths: string[];
  };
}

export const getResumePresentation = (
  metadata: ResumeParserMetadata | null,
): ResumePresentation => {
  const data = metadata?.extractedData ?? {};
  const skillValues = collectParsedSkills(data.skills);
  const experience = records(data.employmentHistory).length
    ? records(data.employmentHistory)
    : records(data.experience);
  const companies = new Set(
    experience
      .map((item) =>
        typeof item.company === 'string'
          ? item.company
          : typeof item.companyName === 'string'
            ? item.companyName
            : '',
      )
      .filter(Boolean),
  );
  const parseQuality = isRecord(data.parseQuality) ? data.parseQuality : {};

  return {
    confidenceScore: metadata?.confidenceScore ?? null,
    counts: {
      certifications: records(data.certifications).length,
      companies: companies.size,
      education: records(data.education).length,
      projects: records(data.projects).length,
      skills: new Set(skillValues).size,
    },
    insights: {
      areasToImprove: strings(parseQuality.warnings),
      missingInformation: strings(parseQuality.missingImportantFields),
      suggestions: strings(parseQuality.suggestions),
      strengths: strings(parseQuality.strengths),
    },
  };
};

export const getProfileCompletion = (values: ResumeProfileFormValues) => {
  const entries: string[] = [
    values.certifications,
    values.currentCompany,
    values.designation,
    values.education,
    values.email,
    values.fullName,
    values.location,
    values.phone,
    values.projects,
    values.skills,
    values.summary,
    values.totalExperience,
    values.workExperience,
  ];
  if (entries.length === 0) return 0;
  return Math.round(
    (entries.filter((value) => value.trim().length > 0).length / entries.length) * 100,
  );
};
