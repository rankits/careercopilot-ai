import type { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import type {
  AssistedApplyWorkspaceDto,
  WorkspaceStepId,
  WorkspaceStepStatus,
} from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';
import type { ProfileJobMatchResult } from '@/modules/auto-apply/types/profile-job-match.types.js';
import {
  WORKSPACE_STEP_IDS,
  WORKSPACE_STEP_LABELS,
} from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';

export function toAssistedApplyViewState(status: JobApplicationDto['status']): string {
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
      return 'ACTION_REQUIRED';
    case 'SUBMITTED':
    case 'CONFIRMATION_RECEIVED':
      return 'APPLIED';
    case 'WITHDRAWN':
      return 'ABANDONED';
    case 'COULD_NOT_APPLY':
    case 'JOB_CLOSED':
      return 'FAILED';
    default:
      return 'LEGACY_ATTENTION';
  }
}

export function labelForAssistedApplyViewState(state: string): string {
  switch (state) {
    case 'TRACKED':
      return 'Tracking started';
    case 'NEEDS_INFO':
      return 'Information needed';
    case 'BLOCKED':
      return "Can't apply this way";
    case 'READY_TO_OPEN':
      return 'Ready to open application';
    case 'ACTION_REQUIRED':
      return 'Action required';
    case 'OPENED':
      return 'Application opened';
    case 'APPLIED':
      return 'Marked as applied';
    case 'ABANDONED':
      return 'Stopped';
    default:
      return 'Needs attention';
  }
}

export function computeWorkspaceSteps(input: {
  hasAnalysis: boolean;
  application: JobApplicationDto;
  analysisSummary: AssistedApplyWorkspaceDto['analysisSummary'];
  /** Fit is complete only when a persisted profile match can be projected. */
  profileMatch?: ProfileJobMatchResult | null;
}): WorkspaceStepStatus[] {
  const { hasAnalysis, application, analysisSummary, profileMatch = null } = input;

  const analysisComplete = hasAnalysis;
  const fitComplete = profileMatch != null && profileMatch.schemaVersion === 1;
  const resumeComplete = Boolean(application.resumeVersionId);

  const openComplete = Boolean(
    application.handoffOpenedAt ||
    application.externalConfirmationUrl ||
    application.status === 'ACTION_REQUIRED' ||
    application.status === 'SUBMITTED' ||
    application.status === 'CONFIRMATION_RECEIVED',
  );

  const doneComplete =
    application.status === 'SUBMITTED' ||
    application.status === 'CONFIRMATION_RECEIVED' ||
    application.status === 'WITHDRAWN' ||
    application.status === 'COULD_NOT_APPLY' ||
    application.status === 'JOB_CLOSED';

  const completeById: Record<WorkspaceStepId, boolean> = {
    analysis: analysisComplete,
    fit: fitComplete,
    resume: resumeComplete,
    open: openComplete,
    done: doneComplete,
  };

  const currentStep =
    (application.progressStep as WorkspaceStepId | null) ??
    firstIncompleteWorkspaceStep(
      WORKSPACE_STEP_IDS.map((id) => ({ id, label: '', complete: completeById[id] })),
    ) ??
    'analysis';

  return WORKSPACE_STEP_IDS.map((id) => {
    let status: WorkspaceStepStatus['status'] = 'AVAILABLE';

    if (id === 'analysis') {
      if (analysisSummary?.status === 'LIMITED') status = 'WARNING';
      else if (analysisSummary?.status === 'FAILED') status = 'UNKNOWN';
      else if (completeById[id]) status = 'COMPLETE';
    } else if (id === 'fit') {
      if (analysisSummary?.status === 'LIMITED' || analysisSummary?.status === 'FAILED')
        status = 'UNKNOWN';
      else if (completeById[id]) status = 'COMPLETE';
    } else if (id === 'done') {
      if (!doneComplete) status = 'LOCKED';
      else status = 'COMPLETE';
    } else {
      status = completeById[id] ? 'COMPLETE' : 'AVAILABLE';
    }

    if (id === currentStep && status !== 'COMPLETE' && status !== 'WARNING') {
      status = 'CURRENT';
    }

    return {
      id,
      label: WORKSPACE_STEP_LABELS[id],
      complete: completeById[id],
      status,
    };
  });
}

export function buildWorkspaceDto(input: {
  application: JobApplicationDto;
  hasAnalysis: boolean;
  analysisSummary: AssistedApplyWorkspaceDto['analysisSummary'];
  profileMatch?: ProfileJobMatchResult | null;
  jobSummary?: { companyName: string | null; workplaceMode: string | null } | null;
}): AssistedApplyWorkspaceDto {
  const viewState = toAssistedApplyViewState(input.application.status);
  const steps = computeWorkspaceSteps({
    hasAnalysis: input.hasAnalysis,
    application: input.application,
    analysisSummary: input.analysisSummary,
    profileMatch: input.profileMatch ?? null,
  });

  return {
    application: {
      id: input.application.id,
      jobId: input.application.jobId,
      jobTitle: input.application.jobTitle,
      company: input.application.companySlug,
      companyName: input.jobSummary?.companyName ?? input.application.companySlug,
      workplaceMode: input.jobSummary?.workplaceMode ?? null,
      status: input.application.status,
    },
    viewState,
    viewLabel: labelForAssistedApplyViewState(viewState),
    steps,
    progressStep: (input.application.progressStep as WorkspaceStepId | null) ?? null,
    wasReopened: Boolean(input.application.reopenedAt),
    analysisSummary: input.analysisSummary,
    fit: {
      matchScore: input.profileMatch?.overallAlignment ?? input.application.matchScore,
      profileMatch: input.profileMatch ?? null,
    },
    resume: input.application.resumeVersionId
      ? { resumeVersionId: input.application.resumeVersionId }
      : null,
    handoff: {
      externalConfirmationUrl: input.application.externalConfirmationUrl,
      submittedAt: input.application.submittedAt?.toISOString() ?? null,
      openedAt: input.application.handoffOpenedAt?.toISOString() ?? null,
    },
  };
}

/** Steps up to and including the first incomplete step are enabled; completed steps stay enabled. */
export function isWorkspaceStepEnabled(
  steps: WorkspaceStepStatus[],
  stepId: WorkspaceStepId,
): boolean {
  const firstIncomplete = steps.find((s) => !s.complete);
  const target = steps.find((s) => s.id === stepId);
  if (!target) return false;
  if (target.complete) return true;
  if (!firstIncomplete) return true;
  const targetIdx = steps.findIndex((s) => s.id === stepId);
  const incompleteIdx = steps.findIndex((s) => s.id === firstIncomplete.id);
  return targetIdx <= incompleteIdx;
}

export function firstIncompleteWorkspaceStep(steps: WorkspaceStepStatus[]): WorkspaceStepId | null {
  return steps.find((s) => !s.complete)?.id ?? steps[steps.length - 1]?.id ?? null;
}

export function resolveInitialWorkspaceStep(input: {
  steps: WorkspaceStepStatus[];
  explicitStep: string | null | undefined;
  progressStep: string | null | undefined;
}): WorkspaceStepId {
  const valid = new Set(WORKSPACE_STEP_IDS);
  if (input.explicitStep && valid.has(input.explicitStep as WorkspaceStepId)) {
    const id = input.explicitStep as WorkspaceStepId;
    if (isWorkspaceStepEnabled(input.steps, id)) return id;
  }
  if (input.progressStep && valid.has(input.progressStep as WorkspaceStepId)) {
    const id = input.progressStep as WorkspaceStepId;
    if (isWorkspaceStepEnabled(input.steps, id)) return id;
  }
  return firstIncompleteWorkspaceStep(input.steps) ?? 'analysis';
}
