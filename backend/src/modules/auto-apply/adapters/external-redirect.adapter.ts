import {
  JobApplicationAdapter,
  PreparedApplication,
  SubmissionResult,
  ValidationResult,
} from '@/modules/auto-apply/contracts/adapter.contract.js';

/**
 * The one channel Career Copilot can genuinely act on today without any
 * external integration: hand the user off to the job's own apply page and
 * track the outcome as `ACTION_REQUIRED` until the user confirms they
 * applied (Channel 4 in the design doc — "External manual apply").
 * Deliberately never fills or submits a third-party form itself; that is
 * exactly the "uncontrolled bot" behavior this whole feature is built to
 * avoid.
 */
export class ExternalRedirectAdapter implements JobApplicationAdapter {
  readonly channel = 'EXTERNAL_MANUAL' as const;
  readonly provider = 'external-redirect';

  async validate(application: PreparedApplication): Promise<ValidationResult> {
    if (!application.externalApplyUrl) {
      return {
        valid: false,
        issues: ['No validated external apply URL is available for this job.'],
      };
    }
    return { valid: true, issues: [] };
  }

  async submit(application: PreparedApplication): Promise<SubmissionResult> {
    if (!application.externalApplyUrl) {
      return {
        outcome: 'FAILED_DO_NOT_RETRY',
        errorCode: 'NO_APPLY_URL',
        errorMessage: 'No validated external apply URL is available for this job.',
      };
    }

    return {
      outcome: 'SUCCEEDED',
      requiresUserAction: true,
      externalConfirmationUrl: application.externalApplyUrl,
    };
  }
}
