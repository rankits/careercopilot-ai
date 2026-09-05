import {
  ApplicationReadinessInput,
  ApplicationReadinessResult,
  SetupCompletenessResult,
} from '@/modules/auto-apply/types/application-readiness.types.js';

export interface UserContactSnapshot {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface IUserContactLookup {
  findByUserId(userId: string): Promise<UserContactSnapshot | null>;
}

export interface IMatchScoreLookup {
  /** Trusted match score from JobRecommendation (or previously stamped value). */
  findOverallScore(userId: string, jobId: string): Promise<number | null>;
}

export interface TrackerDuplicateSnapshot {
  id: string;
  jobId: string | null;
  normalisedJobUrl: string | null;
  currentStatus: string;
}

export interface ITrackerDuplicateLookup {
  findActiveByUserAndJobId(userId: string, jobId: string): Promise<TrackerDuplicateSnapshot | null>;
}

export interface ApplicationLimitWindow {
  dailyUsed: number;
  weeklyUsed: number;
  dailyLimit: number;
  weeklyLimit: number | null;
}

export interface IApplicationLimitCounter {
  countConsumedSince(userId: string, since: Date): Promise<number>;
}

export interface IApplicationReadinessService {
  evaluate(input: ApplicationReadinessInput): Promise<ApplicationReadinessResult>;
  /** Profile-side PLAN blocking checks without job context (Assisted Apply setup gate). */
  evaluateSetupCompleteness(userId: string): Promise<SetupCompletenessResult>;
}

export interface IFeatureFlagLookup {
  isAutoApplyEnabled(): boolean;
}
