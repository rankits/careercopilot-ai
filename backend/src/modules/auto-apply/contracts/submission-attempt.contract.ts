import {
  ApplicationSubmissionAttemptDto,
  SubmissionAttemptOutcomeValue,
} from '@/modules/auto-apply/types/submission-attempt.types.js';

export interface CreateSubmissionAttemptData {
  jobApplicationId: string;
  attemptNumber: number;
  outcome: SubmissionAttemptOutcomeValue;
  errorCode?: string;
  errorMessage?: string;
  rawResponseSanitized?: Record<string, unknown>;
}

export interface ISubmissionAttemptRepository {
  countByJobApplicationId(jobApplicationId: string): Promise<number>;
  create(data: CreateSubmissionAttemptData): Promise<ApplicationSubmissionAttemptDto>;
  findLatest(jobApplicationId: string): Promise<ApplicationSubmissionAttemptDto | null>;
}
