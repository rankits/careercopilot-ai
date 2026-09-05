export type ApiApplicationStatus =
  | 'SAVED'
  | 'PREPARING'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'ACCEPTED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'GHOSTED'
  | 'EXPIRED';

export type ApiApplicationSourceType =
  | 'MANUAL'
  | 'PLATFORM_JOB'
  | 'PLATFORM_APPLY'
  | 'EXTERNAL_JOB_URL'
  | 'EMAIL_IMPORT'
  | 'ATS_IMPORT'
  | 'BROWSER_EXTENSION'
  | 'CSV_IMPORT'
  | 'EXTERNAL_API'
  | 'AI_ASSISTED';

export type ApiApplicationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ApplicationSortBy =
  | 'updatedAt:desc'
  | 'updatedAt:asc'
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'appliedAt:desc'
  | 'appliedAt:asc'
  | 'companyName:asc'
  | 'priority:asc'
  | 'priority:desc';

export interface ApplicationDto {
  appliedAt: string | null;
  archivedAt: string | null;
  closedAt: string | null;
  companyId: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  createdAt: string;
  currentStatus: ApiApplicationStatus;
  employmentType: string | null;
  firstResponseAt: string | null;
  id: string;
  interestLevel: number | null;
  jobId: string | null;
  jobTitle: string;
  location: string | null;
  originalJobUrl: string | null;
  primarySourceType: ApiApplicationSourceType;
  priority: ApiApplicationPriority;
  remoteType: string | null;
  salaryCurrency: string | null;
  salaryMax: string | null;
  salaryMin: string | null;
  salaryPeriod: string | null;
  updatedAt: string;
  userId: string;
}

export interface ApplicationPagination {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedApplicationsResponse {
  items: ApplicationDto[];
  pagination: ApplicationPagination;
}

export interface ApplicationListParams {
  archived?: 'true' | 'false' | 'all';
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: ApplicationSortBy;
  sourceType?: ApiApplicationSourceType | ApiApplicationSourceType[];
  status?: ApiApplicationStatus | ApiApplicationStatus[];
}

export interface BackendSuccessResponse<T> {
  data: T;
  message: string;
  status: 'success';
}

export type ApiSalaryPeriod = 'YEAR' | 'MONTH' | 'HOUR';

export interface CreateManualApplicationPayload {
  appliedAt?: string;
  companyName: string;
  currentStatus?: ApiApplicationStatus;
  jobTitle: string;
  location?: string;
  originalJobUrl?: string;
  priority?: ApiApplicationPriority;
  salaryCurrency?: string;
  salaryMax?: number;
  salaryMin?: number;
  salaryPeriod?: ApiSalaryPeriod;
  sourceType: 'MANUAL';
}

export interface CreatePlatformJobApplicationPayload {
  appliedAt?: string;
  currentStatus?: ApiApplicationStatus;
  jobId: string;
  priority?: ApiApplicationPriority;
  sourceType: 'PLATFORM_JOB' | 'PLATFORM_APPLY';
}

export interface CreateExternalUrlApplicationPayload {
  appliedAt?: string;
  companyName: string;
  currentStatus?: ApiApplicationStatus;
  jobTitle: string;
  location?: string;
  originalJobUrl: string;
  priority?: ApiApplicationPriority;
  salaryCurrency?: string;
  salaryMax?: number;
  salaryMin?: number;
  salaryPeriod?: ApiSalaryPeriod;
  sourceType: 'EXTERNAL_JOB_URL';
}

export type CreateApplicationPayload =
  | CreateManualApplicationPayload
  | CreatePlatformJobApplicationPayload
  | CreateExternalUrlApplicationPayload;

export type ApiNoteType =
  'GENERAL' | 'INTERVIEW' | 'RECRUITER' | 'PREPARATION' | 'OFFER' | 'REJECTION';

export type ApiTaskType =
  | 'FOLLOW_UP'
  | 'PREPARE_INTERVIEW'
  | 'COMPLETE_ASSESSMENT'
  | 'SEND_DOCUMENT'
  | 'RESEARCH_COMPANY'
  | 'NEGOTIATE_OFFER'
  | 'OTHER';

export type ApiTaskStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export type ApiStatusChangedBy = 'USER' | 'SYSTEM' | 'IMPORT' | 'AI';

export interface ApplicationStatusHistoryDto {
  applicationId: string;
  changedAt: string;
  changedBy: ApiStatusChangedBy;
  fromStatus: ApiApplicationStatus | null;
  id: string;
  note: string | null;
  toStatus: ApiApplicationStatus;
}

export interface ApplicationNoteDto {
  applicationId: string;
  content: string;
  createdAt: string;
  id: string;
  type: ApiNoteType;
  updatedAt: string;
}

export interface ApplicationTaskDto {
  applicationId: string;
  completedAt: string | null;
  createdAt: string;
  description: string | null;
  dueAt: string | null;
  id: string;
  status: ApiTaskStatus;
  title: string;
  type: ApiTaskType;
  updatedAt: string;
}

export interface ApplicationDetailDto extends ApplicationDto {
  descriptionSnapshot: string | null;
  notes: ApplicationNoteDto[];
  skillsSnapshot: string[];
  statusHistory: ApplicationStatusHistoryDto[];
  tasks: ApplicationTaskDto[];
}

export interface UpdateApplicationPayload {
  appliedAt?: string | null;
  companyName?: string;
  employmentType?: string | null;
  interestLevel?: number | null;
  jobTitle?: string;
  location?: string | null;
  priority?: ApiApplicationPriority;
  remoteType?: string | null;
  salaryCurrency?: string | null;
  salaryMax?: number | null;
  salaryMin?: number | null;
  salaryPeriod?: ApiSalaryPeriod | null;
}

export interface StatusTransitionPayload {
  note?: string;
  toStatus: ApiApplicationStatus;
}

export interface CreateNotePayload {
  content: string;
  type?: ApiNoteType;
}

export interface CreateTaskPayload {
  description?: string;
  dueAt?: string;
  title: string;
  type?: ApiTaskType;
}

export interface UpdateTaskPayload {
  completedAt?: string | null;
  description?: string | null;
  dueAt?: string | null;
  status?: ApiTaskStatus;
  title?: string;
  type?: ApiTaskType;
}
