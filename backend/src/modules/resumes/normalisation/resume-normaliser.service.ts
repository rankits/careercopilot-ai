import { ParsedResumeData } from '@/modules/resumes/types/resume.types.js';
import { normalizeProfessionalSkills } from '@/modules/resumes/utils/skill-normalizer.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const normalizeNullableText = (value: unknown): string | null => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<string, string>();

  for (const item of value) {
    const normalized = normalizeText(item);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
};

const normalizeRecordArray = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((item) => normalizeRecord(item));
};

const normalizeRecord = (value: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      normalized[key] = normalizeNullableText(entry);
      continue;
    }

    if (Array.isArray(entry)) {
      normalized[key] = entry.map((child) =>
        typeof child === 'string'
          ? normalizeText(child)
          : isRecord(child)
            ? normalizeRecord(child)
            : child,
      );
      continue;
    }

    if (isRecord(entry)) {
      normalized[key] = normalizeRecord(entry);
      continue;
    }

    normalized[key] = entry;
  }

  return normalized;
};

const normalizePersonalDetails = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    return {};
  }

  return normalizeRecord(value);
};

const parseYearMonth = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid YYYY-MM date: ${value}`);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
};

const calculateTotalExperienceMonths = (
  experience: Array<Record<string, unknown>>,
  currentDate = new Date(),
): number => {
  const periods = experience
    .filter((item) => typeof item.startDate === 'string')
    .map((item) => {
      const start = parseYearMonth(String(item.startDate));
      const end =
        item.isCurrent === true || typeof item.endDate !== 'string' || !item.endDate
          ? currentDate
          : parseYearMonth(String(item.endDate));

      return {
        start: new Date(start.getFullYear(), start.getMonth(), 1),
        end: new Date(end.getFullYear(), end.getMonth(), 1),
      };
    })
    .filter((period) => period.end >= period.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (periods.length === 0) {
    return 0;
  }

  const merged: typeof periods = [];

  for (const period of periods) {
    const previous = merged[merged.length - 1];

    if (!previous || period.start > previous.end) {
      merged.push({ ...period });
      continue;
    }

    if (period.end > previous.end) {
      previous.end = period.end;
    }
  }

  return merged.reduce((total, period) => {
    const months =
      (period.end.getFullYear() - period.start.getFullYear()) * 12 +
      period.end.getMonth() -
      period.start.getMonth() +
      1;

    return total + Math.max(months, 0);
  }, 0);
};

export const resumeNormaliserService = {
  normalize(parsedData: ParsedResumeData): ParsedResumeData {
    const experience = normalizeRecordArray(parsedData.experience);
    const calculatedMonths = calculateTotalExperienceMonths(experience);
    const declaredMonths =
      typeof parsedData.totalExperienceMonths === 'number' && parsedData.totalExperienceMonths > 0
        ? parsedData.totalExperienceMonths
        : null;
    const declaredYears =
      typeof parsedData.totalExperienceYears === 'number' && parsedData.totalExperienceYears > 0
        ? parsedData.totalExperienceYears
        : null;
    const personalDetails = normalizePersonalDetails(parsedData.personalDetails);
    const professionalProfile = isRecord(parsedData.professionalProfile)
      ? normalizeRecord(parsedData.professionalProfile)
      : parsedData.professionalProfile;
    const summaryText =
      (isRecord(personalDetails) && typeof personalDetails.summary === 'string'
        ? personalDetails.summary
        : '') ||
      (isRecord(professionalProfile) && typeof professionalProfile.summary === 'string'
        ? professionalProfile.summary
        : '');
    const statedYearsMatch =
      /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\b)/i.exec(summaryText);
    const statedYears = statedYearsMatch ? Number(statedYearsMatch[1]) : null;
    const totalExperienceMonths = Math.max(
      calculatedMonths,
      declaredMonths ?? 0,
      declaredYears !== null ? Math.round(declaredYears * 12) : 0,
      statedYears && Number.isFinite(statedYears) && statedYears > 0 && statedYears < 60
        ? Math.round(statedYears * 12)
        : 0,
    );
    const totalExperienceYears = Number((totalExperienceMonths / 12).toFixed(1));

    return {
      personalDetails,
      professionalProfile: isRecord(professionalProfile)
        ? {
            ...professionalProfile,
            totalExperienceMonths,
            totalExperienceYears,
          }
        : professionalProfile,
      professionalLabels: Array.isArray(parsedData.professionalLabels)
        ? normalizeRecordArray(parsedData.professionalLabels)
        : undefined,
      experience,
      projects: Array.isArray(parsedData.projects)
        ? normalizeRecordArray(parsedData.projects)
        : undefined,
      education: normalizeRecordArray(parsedData.education),
      skills: normalizeProfessionalSkills(normalizeStringArray(parsedData.skills)),
      certifications: normalizeRecordArray(parsedData.certifications),
      languages: Array.isArray(parsedData.languages)
        ? normalizeRecordArray(parsedData.languages)
        : undefined,
      links: isRecord(parsedData.links) ? normalizeRecord(parsedData.links) : undefined,
      totalExperienceMonths,
      totalExperienceYears,
    };
  },
};
