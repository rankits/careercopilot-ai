import {
  ApplicationStatus,
  ApplicationSourceType,
  ApplicationPriority,
  SalaryPeriod,
  StatusChangedBy,
  NoteType,
  TaskType,
  TaskStatus,
} from '@prisma/client';

export interface ApplicationListFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  archived?: 'true' | 'false' | 'all';
  search?: string;
}

export interface ApplicationListPagination {
  page: number;
  limit: number;
}

export type ApplicationSortBy =
  'updatedAt:desc' | 'updatedAt:asc' | 'createdAt:desc' | 'createdAt:asc' | 'companyName:asc';

export interface ApplicationListOptions {
  userId: string;
  filters: ApplicationListFilters;
  pagination: ApplicationListPagination;
  sortBy: ApplicationSortBy;
}

export interface PaginatedApplicationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApplicationDto {
  id: string;
  userId: string;
  jobId: string | null;
  companyId: string | null;
  jobTitle: string;
  companyName: string;
  companyLogoUrl: string | null;
  originalJobUrl: string | null;
  location: string | null;
  remoteType: string | null;
  employmentType: string | null;
  salaryMin: string | null; // Decimal serialized as string
  salaryMax: string | null; // Decimal serialized as string
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  currentStatus: ApplicationStatus;
  primarySourceType: ApplicationSourceType;
  priority: ApplicationPriority;
  interestLevel: number | null;
  appliedAt: string | null;
  firstResponseAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ApplicationStatusHistoryDto {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: Date;
  changedBy: StatusChangedBy;
  note: string | null;
}

export interface ApplicationNoteDto {
  id: string;
  applicationId: string;
  type: NoteType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationTaskDto {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  type: TaskType;
  dueAt: Date | null;
  completedAt: Date | null;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDetailDto extends ApplicationDto {
  descriptionSnapshot: string | null;
  skillsSnapshot: string[];
  statusHistory: ApplicationStatusHistoryDto[];
  notes: ApplicationNoteDto[];
  tasks: ApplicationTaskDto[];
}
