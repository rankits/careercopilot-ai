import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

export type StuckReason = 'QUEUE_STALLED' | 'AWAITING_USER_CONFIRMATION';

export interface StuckSubmissionDto extends JobApplicationDto {
  stuckReason: StuckReason;
  stuckSinceMinutes: number;
}
