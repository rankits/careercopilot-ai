export type SubmissionAttemptOutcomeValue =
  'SUCCEEDED' | 'FAILED_SAFE_TO_RETRY' | 'FAILED_DO_NOT_RETRY' | 'SUBMISSION_OUTCOME_UNKNOWN';

export interface ApplicationSubmissionAttemptDto {
  id: string;
  jobApplicationId: string;
  attemptNumber: number;
  outcome: SubmissionAttemptOutcomeValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
