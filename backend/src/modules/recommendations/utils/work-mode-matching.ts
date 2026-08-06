import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

const normalizeWorkModeToken = (value: string): string | undefined => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '');
  if (!normalized || normalized === 'any') return undefined;
  if (normalized === 'remote' || normalized === 'wfh') return 'REMOTE';
  if (normalized === 'hybrid') return 'HYBRID';
  if (normalized === 'onsite') return 'ONSITE';
  return undefined;
};

const normalizeJobRemoteType = (remoteType: string | null | undefined): string | undefined => {
  if (!remoteType) return undefined;
  const normalized = remoteType.trim().toUpperCase().replace('ON_SITE', 'ONSITE');
  if (normalized === 'REMOTE' || normalized === 'HYBRID' || normalized === 'ONSITE') {
    return normalized;
  }
  return undefined;
};

export const matchesWorkModePreference = (job: JobListDto, remotePreference?: string): boolean => {
  if (!remotePreference) return true;

  const preference = normalizeWorkModeToken(remotePreference);
  if (!preference) return true;

  const remoteType = normalizeJobRemoteType(job.location.remoteType);
  if (remoteType) {
    return remoteType === preference;
  }

  const formattedPreference = normalizeWorkModeToken(job.location.formatted);
  return formattedPreference === preference;
};
