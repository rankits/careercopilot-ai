import { AutoApplyChannelValue } from '@/modules/auto-apply/types/job-application.types.js';
import { SubmissionAttemptOutcomeValue } from '@/modules/auto-apply/types/submission-attempt.types.js';

export interface PreparedApplication {
  jobApplicationId: string;
  userId: string;
  jobId: string;
  /** Populated for EXTERNAL_MANUAL — the validated http(s) apply URL to hand
   * the user off to. Other channels (once built) will add their own
   * prepared fields here (recipient email, resume attachment ref, etc.)
   * rather than overloading this shape prematurely. */
  externalApplyUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface SubmissionResult {
  outcome: SubmissionAttemptOutcomeValue;
  /** True when the adapter cannot itself complete the submission and the
   * user must finish it manually (e.g. EXTERNAL_MANUAL) — the worker maps
   * this to `ACTION_REQUIRED` rather than `SUBMITTED`. */
  requiresUserAction?: boolean;
  externalApplicationId?: string;
  externalConfirmationUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponseSanitized?: Record<string, unknown>;
}

/**
 * Mirrors the target design's `JobApplicationAdapter` interface
 * (inspect/validate/submit/getStatus). `submit` must never be called more
 * than once per attempt by adapter implementations themselves — the
 * worker (`services/submission-processing.service.ts`) owns idempotency
 * and attempt bookkeeping; adapters just do one channel-specific action
 * and report an honest outcome.
 */
export interface JobApplicationAdapter {
  readonly channel: AutoApplyChannelValue;
  readonly provider: string;
  validate(application: PreparedApplication): Promise<ValidationResult>;
  submit(application: PreparedApplication): Promise<SubmissionResult>;
  getStatus?(externalApplicationId: string): Promise<{ status: string } | null>;
}

export interface IJobApplicationAdapterRegistry {
  get(channel: AutoApplyChannelValue): JobApplicationAdapter | null;
}
