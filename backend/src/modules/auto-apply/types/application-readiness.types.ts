export type ApplicationReadinessStage = 'PLAN' | 'APPROVE' | 'QUEUE' | 'SUBMIT';

export type ApplicationReadinessDecision =
  | 'READY'
  | 'INFORMATION_REQUIRED'
  | 'NOT_ELIGIBLE'
  | 'LIMIT_REACHED'
  | 'DUPLICATE'
  | 'CONSENT_REQUIRED'
  | 'CHANNEL_UNSUPPORTED'
  | 'JOB_UNAVAILABLE'
  | 'FEATURE_DISABLED';

export type ApplicationReadinessRuleStatus =
  | 'PASSED'
  | 'FAILED'
  | 'NOT_APPLICABLE'
  | 'UNKNOWN';

export type ApplicationReadinessSeverity = 'BLOCKING' | 'WARNING';

export type ApplicationReadinessCollectionMode =
  | 'ONBOARDING'
  | 'PROGRESSIVE'
  | 'JOB_SPECIFIC';

export interface ApplicationReadinessInput {
  userId: string;
  jobId: string;
  jobApplicationId?: string;
  stage: ApplicationReadinessStage;
}

export interface ApplicationReadinessReason {
  code: string;
  message: string;
  field?: string;
  rule?: string;
  severity: ApplicationReadinessSeverity;
  collectionMode?: ApplicationReadinessCollectionMode;
  metadata?: Record<string, unknown>;
}

export interface ApplicationReadinessRuleResult {
  status: ApplicationReadinessRuleStatus;
  details?: Record<string, unknown>;
}

export interface ApplicationReadinessResult {
  decision: ApplicationReadinessDecision;
  ready: boolean;
  blockingReasons: ApplicationReadinessReason[];
  warnings: ApplicationReadinessReason[];
  evaluatedRules: Record<string, ApplicationReadinessRuleResult>;
  evaluatedAt: Date;
}

/** Statuses that consume a daily/weekly application slot (AJA-RULE-002). */
export const CONSUMED_APPLICATION_STATUSES = [
  'QUEUED',
  'SUBMITTING',
  'SUBMITTED',
  'CONFIRMATION_RECEIVED',
  'ACTION_REQUIRED',
] as const;
