import type { JobCardData } from '@/components/molecules';

import type { JobListDto } from '@/features/jobs/types/job.types';

const companyInitial = (name: string): string => {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};

const formatSalary = (salary: JobListDto['salary']): string => {
  const { minimum, maximum, currency } = salary;
  if (minimum == null && maximum == null) return 'Salary not listed';
  const unit = currency?.toUpperCase() === 'INR' ? 'LPA' : (currency ?? '');
  if (minimum != null && maximum != null) {
    return unit
      ? `${unit} ${minimum.toLocaleString()} - ${maximum.toLocaleString()}`
      : `${minimum.toLocaleString()} - ${maximum.toLocaleString()}`;
  }
  const value = minimum ?? maximum;
  return unit ? `${unit} ${value!.toLocaleString()}` : value!.toLocaleString();
};

const formatPostedAt = (publishedAt: string | null): string => {
  if (!publishedAt) return 'Posted recently';
  const posted = new Date(publishedAt);
  if (Number.isNaN(posted.getTime())) return 'Posted recently';
  const days = Math.max(0, Math.floor((Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted 1d ago';
  return `Posted ${days}d ago`;
};

const remoteTag = (remoteType: string | null): string[] => {
  if (!remoteType) return [];
  const normalized = remoteType.toLowerCase().replace(/_/g, '-');
  if (normalized.includes('remote')) return ['remote'];
  if (normalized.includes('hybrid')) return ['hybrid'];
  return [normalized];
};

const employmentLabel = (employmentType: string | null, remoteType: string | null): string => {
  if (remoteType?.toLowerCase().includes('remote')) return 'Remote';
  if (remoteType?.toLowerCase().includes('hybrid')) return 'Hybrid';
  if (!employmentType) return 'Full-time';
  return employmentType
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

/** Maps API JobListDto → JobCard view model. Match/recommendation fields intentionally omitted. */
export function mapJobToCard(job: JobListDto, index = 0): JobCardData {
  const type = employmentLabel(job.employmentType, job.location.remoteType);
  const tags = [
    ...remoteTag(job.location.remoteType),
    ...(job.employmentType ? [job.employmentType.toLowerCase().replace(/_/g, '-')] : []),
  ];

  return {
    id: job.id,
    accent: index % 2 === 0 ? 'primary' : 'danger',
    company: job.company.name,
    experience: 'Experience not listed',
    experienceBand: 'all',
    logo: companyInitial(job.company.name),
    location: job.location.formatted || 'Location not listed',
    postedAt: formatPostedAt(job.publishedAt),
    salary: formatSalary(job.salary),
    salaryBand: 'all',
    skills: job.skills?.length ? job.skills.slice(0, 6) : ['Skills not listed'],
    tags,
    title: job.title,
    type,
  };
}
