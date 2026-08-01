export type ApplicationStatus =
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'assessment'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export type ApplicationPriority = 'high' | 'medium' | 'low';

export type ApplicationSource = 'platform-apply' | 'platform-job' | 'external-url';

export interface ApplicationRecord {
  appliedDate: string;
  archivedAt: string | null;
  avatarColor: string;
  company: string;
  id: string;
  initials: string;
  interest: number;
  isArchived: boolean;
  location: string;
  priority: ApplicationPriority;
  source: ApplicationSource;
  status: ApplicationStatus;
  title: string;
  updatedAt: string;
}

export interface ApplicationDisplayConfig {
  background: string;
  color: string;
  label: string;
}
