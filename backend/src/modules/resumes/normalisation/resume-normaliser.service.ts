import { ParsedResumeData } from "@/modules/resumes/types/resume.types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
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
    if (typeof entry === "string") {
      normalized[key] = normalizeNullableText(entry);
      continue;
    }

    if (Array.isArray(entry)) {
      normalized[key] = entry.map((child) =>
        typeof child === "string" ? normalizeText(child) : isRecord(child) ? normalizeRecord(child) : child,
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

export const resumeNormaliserService = {
  normalize(parsedData: ParsedResumeData): ParsedResumeData {
    return {
      personalDetails: normalizePersonalDetails(parsedData.personalDetails),
      experience: normalizeRecordArray(parsedData.experience),
      education: normalizeRecordArray(parsedData.education),
      skills: normalizeStringArray(parsedData.skills),
      certifications: normalizeRecordArray(parsedData.certifications),
    };
  },
};

