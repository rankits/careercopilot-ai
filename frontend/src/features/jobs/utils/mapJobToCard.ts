import type { JobCardData } from '@/components/molecules';

import type { JobListDto } from '@/features/jobs/types/job.types';
import { formatJobSalary } from '@/features/jobs/utils/formatJobSalary';
import { formatPostedAt } from '@/features/jobs/utils/formatPostedAt';
import { toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { decodeDisplayText } from '@/lib/decodeHtmlEntities';

const PROVIDER_OR_MODE_TAG =
  /^(remote|hybrid|onsite|on-site|full[-_]?time|part[-_]?time|contract|internship|temporary|arbeitnow|remotive|jobicy|himalayas|remoteok|greenhouse|lever|ashby|recruitee|personio|public[-_]?feed)$/i;

const companyInitial = (name: string): string => {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};

const normalizeLabel = (value: string): string =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** True when a location string is really just a work-mode label (Remote / On-site / Hybrid). */
export const isWorkModeLabel = (value: string): boolean => {
  const normalized = normalizeLabel(value);
  return (
    normalized === 'remote' ||
    normalized === 'hybrid' ||
    normalized === 'onsite' ||
    normalized === 'on site' ||
    normalized === 'location not listed'
  );
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
  if (remote) return 'Work mode unknown';
  if (!employmentType) return 'Full-time';
  return employmentType
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

const formatLocation = (formatted: string | null | undefined): string => {
  const value = formatted?.trim() ?? '';
  if (!value || isWorkModeLabel(value)) return '';
  return value;
};

const filterDisplaySkills = (skills: string[] | undefined, type: string): string[] => {
  const typeKey = normalizeLabel(type);
  const seen = new Set<string>();

  return (skills ?? [])
    .map((skill) => skill.trim())
    .filter(Boolean)
    .filter((skill) => {
      const key = normalizeLabel(skill);
      if (PROVIDER_OR_MODE_TAG.test(skill) || PROVIDER_OR_MODE_TAG.test(key)) return false;
      if (isWorkModeLabel(skill)) return false;
      if (key === typeKey) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
};

/** Maps API JobListDto → JobCard view model. Match/recommendation fields intentionally omitted. */
export function mapJobListDtoToCard(job: JobListDto, index = 0): JobCardData {
  const type = employmentLabel(job.employmentType, job.location.remoteType);
  const tags = [
    ...remoteTag(job.location.remoteType),
    ...(job.employmentType ? [job.employmentType.toLowerCase().replace(/_/g, '-')] : []),
  ];

  return {
    id: job.id,
    accent: index % 2 === 0 ? 'primary' : 'danger',
    applyUrl: toSafeApplyUrl(job.applyUrl),
    company: decodeDisplayText(job.company.name) || 'Company not listed',
    experience: '',
    experienceBand: 'all',
    logo: companyInitial(decodeDisplayText(job.company.name) || '?'),
    location: formatLocation(job.location.formatted),
    postedAt: formatPostedAt(job.publishedAt),
    salary: formatJobSalary(job.salary),
    salaryBand: 'all',
    skills: filterDisplaySkills(job.skills, type),
    tags,
    title: decodeDisplayText(job.title) || 'Untitled role',
    type,
    verified: job.company.verified,
    isSaved: job.isSaved,
  };
}

/** @deprecated Prefer mapJobListDtoToCard */
export const mapJobToCard = mapJobListDtoToCard;
