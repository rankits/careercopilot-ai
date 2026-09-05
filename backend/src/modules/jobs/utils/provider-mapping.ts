import type { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import type { JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { JobSalaryPeriod } from '@/modules/jobs/types/job.types.js';

export const cleanRequiredString = (
  value: string | null | undefined,
  fieldName: string,
): string => {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(`Cannot map job because "${fieldName}" is missing`);
  }
  return cleaned;
};

export const cleanOptionalString = (value: string | null | undefined): string | undefined => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

export const stripHtml = (value: string | null | undefined): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  const cleaned = value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || undefined;
};

export const toIsoDate = (value: number | string | null | undefined): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const epochMilliseconds = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(epochMilliseconds);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return undefined;
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return toIsoDate(Number(trimmed));
    }
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
};

export const isRemoteLocation = (location: string | undefined): boolean => {
  if (!location) return false;
  return /\b(remote|anywhere|worldwide|work from home|wfh)\b/i.test(location);
};

export const isHybridLocation = (location: string | undefined): boolean => {
  if (!location) return false;
  return /\bhybrid\b/i.test(location);
};

/** Resolve stored remoteType from location text + remote flag. */
export const resolveRemoteType = (location: {
  raw?: string;
  isRemote?: boolean;
}): 'REMOTE' | 'HYBRID' | 'ONSITE' => {
  const raw = location.raw ?? '';
  if (isHybridLocation(raw) || /\bhybrid\b/i.test(raw)) {
    return 'HYBRID';
  }
  if (location.isRemote || isRemoteLocation(raw)) {
    return 'REMOTE';
  }
  return 'ONSITE';
};

/** Normalize provider tags into employment_type values used by job search filters. */
export const resolveEmploymentType = (
  tags: ReadonlyArray<string> | null | undefined,
): string | null => {
  const haystack = (tags ?? []).join(' ').toLowerCase().replace(/[_-]+/g, ' ');

  if (/\bintern(ship)?\b/.test(haystack)) return 'INTERNSHIP';
  if (/\bpart\s*time\b/.test(haystack)) return 'PART_TIME';
  if (/\bcontract\b/.test(haystack)) return 'CONTRACT';
  if (/\bfull\s*time\b/.test(haystack)) return 'FULL_TIME';

  return null;
};

export const uniqueTags = (...groups: Array<string[] | null | undefined>): string[] => {
  const values = groups
    .flatMap((group) => group ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Map(values.map((value) => [value.toLocaleLowerCase(), value])).values());
};

export const mapSalaryPeriod = (value: string | null | undefined): JobSalaryPeriod => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (normalized.includes('hour')) return JobSalaryPeriod.HOURLY;
  if (normalized.includes('month')) return JobSalaryPeriod.MONTHLY;
  return JobSalaryPeriod.YEARLY;
};

export const applyJobSearchFilters = (
  jobs: NormalizedJob[],
  filters: JobSearchFilters,
): NormalizedJob[] => {
  let normalized = jobs;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    normalized = normalized.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.companyName.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q),
    );
  }

  if (filters.company) {
    const company = filters.company.toLowerCase();
    normalized = normalized.filter((job) => job.companyName.toLowerCase().includes(company));
  }

  if (filters.location) {
    const loc = filters.location.toLowerCase();
    normalized = normalized.filter(
      (job) =>
        job.location.raw.toLowerCase().includes(loc) ||
        job.location.city?.toLowerCase().includes(loc) === true ||
        job.location.country?.toLowerCase().includes(loc) === true,
    );
  }

  if (filters.isRemote !== undefined) {
    normalized = normalized.filter((job) => job.location.isRemote === filters.isRemote);
  }

  if (filters.minSalary !== undefined) {
    normalized = normalized.filter(
      (job) => job.salary?.min !== undefined && job.salary.min >= filters.minSalary!,
    );
  }

  return normalized;
};
