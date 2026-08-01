import { palette } from '@/tokens';

import type {
  ApiApplicationPriority,
  ApiApplicationSourceType,
  ApiApplicationStatus,
  ApplicationDto,
  ApplicationSortBy,
} from '../types/application.types';
import type {
  ApplicationPriority,
  ApplicationRecord,
  ApplicationSource,
  ApplicationStatus,
} from '../types/application.view.types';

const avatarPalette = [
  palette.blue600,
  palette.blue500,
  '#4285F4',
  '#0078D4',
  '#635BFF',
  '#FF5A5F',
  '#1877F2',
  '#E50914',
  '#FF9900',
  '#FF0000',
];

const statusMap: Record<ApiApplicationStatus, ApplicationStatus> = {
  ACCEPTED: 'offer',
  APPLIED: 'applied',
  ASSESSMENT: 'assessment',
  EXPIRED: 'withdrawn',
  GHOSTED: 'withdrawn',
  HIRED: 'offer',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  PREPARING: 'preparing',
  REJECTED: 'rejected',
  SAVED: 'saved',
  SCREENING: 'screening',
  WITHDRAWN: 'withdrawn',
};

const sourceMap: Record<ApiApplicationSourceType, ApplicationSource> = {
  AI_ASSISTED: 'external-url',
  ATS_IMPORT: 'external-url',
  BROWSER_EXTENSION: 'external-url',
  CSV_IMPORT: 'external-url',
  EMAIL_IMPORT: 'external-url',
  EXTERNAL_API: 'external-url',
  EXTERNAL_JOB_URL: 'external-url',
  MANUAL: 'external-url',
  PLATFORM_APPLY: 'platform-apply',
  PLATFORM_JOB: 'platform-job',
};

const priorityMap: Record<ApiApplicationPriority, ApplicationPriority> = {
  HIGH: 'high',
  LOW: 'low',
  MEDIUM: 'medium',
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return (words[0] ?? '?').slice(0, 2).toUpperCase();
  }

  const firstWord = words[0] ?? '';
  const secondWord = words[1] ?? '';
  return `${firstWord[0] ?? ''}${secondWord[0] ?? ''}`.toUpperCase();
}

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  if (diffDays < 14) {
    return '1w ago';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function mapApiStatusToUi(status: ApiApplicationStatus): ApplicationStatus {
  return statusMap[status];
}

export function mapUiStatusToApi(status: ApplicationStatus): ApiApplicationStatus {
  return status.toUpperCase() as ApiApplicationStatus;
}

export function mapUiPriorityToApi(priority: ApplicationPriority): ApiApplicationPriority {
  return priority.toUpperCase() as ApiApplicationPriority;
}

export function mapApiPriorityToUi(priority: ApiApplicationPriority): ApplicationPriority {
  return priorityMap[priority];
}

export function formatAbsoluteDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

export function mapUiSortToApi(sortBy: string): ApplicationSortBy | undefined {
  switch (sortBy) {
    case 'recently-updated':
      return 'updatedAt:desc';
    case 'applied-date':
      return 'createdAt:desc';
    case 'company':
      return 'companyName:asc';
    default:
      return undefined;
  }
}

export function mapUiArchiveToApi(archiveFilter: string): 'true' | 'false' | 'all' {
  if (archiveFilter === 'archived') {
    return 'true';
  }

  if (archiveFilter === 'all') {
    return 'all';
  }

  return 'false';
}

export function mapApplicationDtoToRecord(dto: ApplicationDto): ApplicationRecord {
  const company = dto.companyName.trim() || 'Unknown company';

  return {
    appliedDate: formatDisplayDate(dto.appliedAt ?? dto.createdAt),
    archivedAt: dto.archivedAt,
    avatarColor: avatarPalette[hashString(company) % avatarPalette.length] ?? palette.blue600,
    company,
    id: dto.id,
    initials: getInitials(company),
    interest: dto.interestLevel ?? 0,
    isArchived: Boolean(dto.archivedAt),
    location: dto.location?.trim() || 'Location not specified',
    priority: priorityMap[dto.priority],
    source: sourceMap[dto.primarySourceType],
    status: statusMap[dto.currentStatus],
    title: dto.jobTitle,
    updatedAt: formatDisplayDate(dto.updatedAt),
  };
}
