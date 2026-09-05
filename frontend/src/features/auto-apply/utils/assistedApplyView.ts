import type { JobApplicationDto } from '../types/autoApply.types';

export type AssistedApplyViewState =
  | 'TRACKED'
  | 'NEEDS_INFO'
  | 'BLOCKED'
  | 'READY_TO_OPEN'
  | 'OPENED'
  | 'APPLIED'
  | 'ABANDONED'
  | 'LEGACY_ATTENTION';

export function toAssistedApplyView(status: JobApplicationDto['status']): AssistedApplyViewState {
  switch (status) {
    case 'DISCOVERED':
    case 'MATCHED':
    case 'APPLICATION_PLANNING':
      return 'TRACKED';
    case 'INFORMATION_REQUIRED':
      return 'NEEDS_INFO';
    case 'NOT_ELIGIBLE':
      return 'BLOCKED';
    case 'READY_FOR_REVIEW':
      return 'READY_TO_OPEN';
    case 'ACTION_REQUIRED':
      return 'OPENED';
    case 'SUBMITTED':
    case 'CONFIRMATION_RECEIVED':
      return 'APPLIED';
    case 'WITHDRAWN':
    case 'COULD_NOT_APPLY':
    case 'JOB_CLOSED':
      return 'ABANDONED';
    case 'APPROVED':
    case 'QUEUED':
    case 'SUBMITTING':
    case 'SUBMISSION_FAILED':
    case 'READY_FOR_AUTOPILOT':
      return 'LEGACY_ATTENTION';
    default:
      console.error(`Unknown JobApplicationStatus: ${String(status)}`);
      return 'LEGACY_ATTENTION';
  }
}

export function labelForViewState(state: AssistedApplyViewState): string {
  switch (state) {
    case 'TRACKED':
      return 'Tracking started';
    case 'NEEDS_INFO':
      return 'Information needed';
    case 'BLOCKED':
      return "Can't apply this way";
    case 'READY_TO_OPEN':
      return 'Ready to open application';
    case 'OPENED':
      return 'Application opened';
    case 'APPLIED':
      return 'Marked as applied';
    case 'ABANDONED':
      return 'Stopped';
    case 'LEGACY_ATTENTION':
      return 'Needs attention';
  }
}

export function tooltipForViewState(state: AssistedApplyViewState): string | undefined {
  if (state === 'LEGACY_ATTENTION') {
    return 'This application was left in an older processing state. You can abandon it and start Assisted Apply again.';
  }
  return undefined;
}
