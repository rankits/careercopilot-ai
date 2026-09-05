export type AutoApplyEventType =
  | 'PLAN_CREATED'
  | 'ELIGIBILITY_EVALUATED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'SUBMISSION_INITIATED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_QUEUED'
  | 'SUBMISSION_SUCCEEDED'
  | 'SUBMISSION_FAILED'
  | 'SUBMISSION_OUTCOME_UNKNOWN'
  | 'SUBMISSION_CONFIRMED'
  | 'SUBMISSION_WITHDRAWN'
  | 'SUBMISSION_RECLAIMED'
  | 'RESUME_CONFIRMED'
  | 'HANDOFF_OPENED'
  | 'MARKED_APPLIED'
  | 'BROKEN_LINK_REPORTED'
  | 'LEGACY_STATUS_REPAIRED';

export interface AutoApplyAuditEventDto {
  id: string;
  userId: string;
  jobApplicationId: string | null;
  eventType: AutoApplyEventType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
