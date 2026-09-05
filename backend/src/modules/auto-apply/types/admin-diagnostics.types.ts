import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

export type StuckReason = 'QUEUE_STALLED' | 'AWAITING_USER_CONFIRMATION';

export interface StuckSubmissionDto extends JobApplicationDto {
  stuckReason: StuckReason;
  stuckSinceMinutes: number;
}

export interface ReclaimStuckResult {
  reclaimed: number;
  jobApplicationIds: string[];
}

/** Minimal row needed to reclaim a stuck SUBMITTING application. */
export interface StuckSubmittingCandidate {
  id: string;
  userId: string;
  updatedAt: Date;
}
