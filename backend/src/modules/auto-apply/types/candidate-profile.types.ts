export type RemotePreference = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY';

export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
}

export interface CandidateApplicationPreferences {
  desiredRoles: string[];
  preferredLocations: string[];
  remotePreference: RemotePreference;
  expectedSalary?: SalaryRange;
  noticePeriodDays?: number;
  willingToRelocate?: boolean;
  requiresSponsorship?: boolean;
}

export interface CandidateApplicationLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface FieldVerification {
  source: 'USER_VERIFIED';
  lastVerifiedAt: string;
  confidence?: number;
}

export type CandidateApplicationVerification = Record<string, FieldVerification>;

export interface CandidateApplicationProfileDto {
  id: string;
  userId: string;
  preferences: CandidateApplicationPreferences;
  links: CandidateApplicationLinks;
  verification: CandidateApplicationVerification;
  createdAt: Date;
  updatedAt: Date;
}
