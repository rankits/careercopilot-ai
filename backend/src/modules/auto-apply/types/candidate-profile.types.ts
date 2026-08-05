export type WorkModePreference = 'REMOTE' | 'HYBRID' | 'ONSITE';

/** @deprecated Prefer `remotePreferences`. Kept for older stored profiles. */
export type RemotePreference = WorkModePreference | 'ANY';

export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
}

export interface CandidateApplicationPreferences {
  desiredRoles: string[];
  preferredLocations: string[];
  /** Multi-select workplace modes. Empty = any (same as legacy ANY). */
  remotePreferences: WorkModePreference[];
  /** @deprecated Use remotePreferences. Still written for backward compatibility. */
  remotePreference?: RemotePreference;
  expectedSalary?: SalaryRange;
  /** Days until available. `0` means immediate joiner. */
  noticePeriodDays?: number;
  willingToRelocate?: boolean;
  requiresSponsorship?: boolean;
  /** Candidate's current city or region (distinct from preferred job locations). */
  currentLocation?: string;
  /** ISO 3166-1 alpha-2 country code for the candidate's current location. */
  currentCountry?: string;
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
