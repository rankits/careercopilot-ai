import type { JobCardData } from '@/components/molecules';

import type { ApplicationDto } from '@/features/applications/types/application.types';
import { formatSavedAt } from '@/features/applications/utils/formatSavedAt';
import { formatJobSalary } from '@/features/jobs/utils/formatJobSalary';
import { toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { decodeDisplayText } from '@/lib/decodeHtmlEntities';

const companyInitial = (name: string): string => {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};

const formatApplicationSalary = (app: ApplicationDto): string => {
  const min = app.salaryMin != null && app.salaryMin !== '' ? Number(app.salaryMin) : null;
  const max = app.salaryMax != null && app.salaryMax !== '' ? Number(app.salaryMax) : null;
  return formatJobSalary({
    minimum: min != null && !Number.isNaN(min) ? min : null,
    maximum: max != null && !Number.isNaN(max) ? max : null,
    currency: app.salaryCurrency,
  });
};

const remoteTag = (remoteType: string | null): string[] => {
  if (!remoteType) return [];
  const normalized = remoteType.toLowerCase().replace(/_/g, '-');
  if (normalized.includes('remote')) return ['remote'];
  if (normalized.includes('hybrid')) return ['hybrid'];
  if (normalized.includes('onsite') || normalized.includes('on-site')) return ['onsite'];
  return [normalized];
};

const employmentLabel = (employmentType: string | null, remoteType: string | null): string => {
  const remote = remoteType?.toLowerCase() ?? '';
  if (remote.includes('remote')) return 'Remote';
  if (remote.includes('hybrid')) return 'Hybrid';
  if (remote.includes('onsite') || remote.includes('on-site')) return 'On-site';
  if (!employmentType) return 'Full-time';
  return employmentType
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

const formatLocation = (location: string | null | undefined): string => {
  const value = location?.trim() ?? '';
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (
    normalized === 'remote' ||
    normalized === 'hybrid' ||
    normalized === 'onsite' ||
    normalized === 'on-site' ||
    normalized === 'on site'
  ) {
    return '';
  }
  return value;
};

export interface SavedJobCardModel extends JobCardData {
  applicationId: string;
  /** ISO timestamp used for sorting. */
  savedAt: string;
  workMode: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  wasApplied: boolean;
}

const resolveWorkMode = (remoteType: string | null): SavedJobCardModel['workMode'] => {
  const tags = remoteTag(remoteType);
  if (tags.includes('remote')) return 'remote';
  if (tags.includes('hybrid')) return 'hybrid';
  if (tags.includes('onsite')) return 'onsite';
  return 'unknown';
};

/** Maps a saved ApplicationDto into the shared JobCard view model. */
export function mapApplicationDtoToSavedJobCard(app: ApplicationDto, index = 0): SavedJobCardModel {
  const type = employmentLabel(app.employmentType, app.remoteType);
  const tags = [
    ...remoteTag(app.remoteType),
    ...(app.employmentType ? [app.employmentType.toLowerCase().replace(/_/g, '-')] : []),
  ];

  return {
    applicationId: app.id,
    id: app.jobId ?? undefined,
    accent: index % 2 === 0 ? 'primary' : 'danger',
    applyUrl: toSafeApplyUrl(app.originalJobUrl),
    company: decodeDisplayText(app.companyName) || 'Company not listed',
    experience: '',
    experienceBand: 'all',
    logo: companyInitial(decodeDisplayText(app.companyName) || '?'),
    location: formatLocation(app.location),
    postedAt: formatSavedAt(app.createdAt),
    salary: formatApplicationSalary(app),
    salaryBand: 'all',
    savedAt: app.createdAt,
    skills: [],
    tags,
    title: decodeDisplayText(app.jobTitle) || 'Untitled role',
    type,
    verified: false,
    wasApplied: Boolean(app.appliedAt) || app.currentStatus === 'APPLIED',
    workMode: resolveWorkMode(app.remoteType),
  };
}
