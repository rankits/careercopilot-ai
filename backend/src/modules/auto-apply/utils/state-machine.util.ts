import { JobApplicationStatus } from '@prisma/client';

/**
 * Validated transition graph for the auto-apply submission lifecycle
 * (AJA-LIFE-001 / AJA-PROD-006) — deliberately separate from the
 * recruitment tracker's `ApplicationStatus` graph in application-management,
 * which this module never touches. Wave 4+ (queue/submit) and Wave 6
 * (autopilot) extend how these states get reached; this graph is written
 * now so every later wave calls the same validated `transitionStatus`
 * rather than re-deriving allowed transitions per feature.
 */
const TRANSITIONS: Record<JobApplicationStatus, JobApplicationStatus[]> = {
  DISCOVERED: ['MATCHED', 'NOT_ELIGIBLE', 'WITHDRAWN'],
  MATCHED: ['NOT_ELIGIBLE', 'APPLICATION_PLANNING', 'WITHDRAWN'],
  NOT_ELIGIBLE: ['MATCHED', 'WITHDRAWN'],
  APPLICATION_PLANNING: ['INFORMATION_REQUIRED', 'READY_FOR_REVIEW', 'WITHDRAWN'],
  INFORMATION_REQUIRED: ['READY_FOR_REVIEW', 'WITHDRAWN'],
  READY_FOR_REVIEW: ['APPROVED', 'READY_FOR_AUTOPILOT', 'WITHDRAWN'],
  READY_FOR_AUTOPILOT: ['APPROVED', 'WITHDRAWN'],
  APPROVED: ['QUEUED', 'WITHDRAWN'],
  QUEUED: ['SUBMITTING', 'WITHDRAWN'],
  SUBMITTING: ['SUBMITTED', 'SUBMISSION_FAILED', 'ACTION_REQUIRED'],
  SUBMITTED: ['CONFIRMATION_RECEIVED'],
  CONFIRMATION_RECEIVED: [],
  // Only a FAILED_SAFE_TO_RETRY outcome (Wave 4, AJA-QUEUE-002) may ever
  // drive this transition — never a blind/automatic retry.
  SUBMISSION_FAILED: ['QUEUED'],
  ACTION_REQUIRED: ['SUBMITTED', 'WITHDRAWN'],
  WITHDRAWN: ['DISCOVERED'],
};

export function isValidTransition(from: JobApplicationStatus, to: JobApplicationStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(from: JobApplicationStatus): JobApplicationStatus[] {
  return TRANSITIONS[from] ?? [];
}
