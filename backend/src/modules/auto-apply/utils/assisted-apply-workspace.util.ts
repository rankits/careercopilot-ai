import type { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import type {
  AssistedApplyWorkspaceDto,
  WorkspaceStepId,
  WorkspaceStepStatus,
} from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';
import {
  WORKSPACE_STEP_IDS,
  WORKSPACE_STEP_LABELS,
} from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';

/** Mirrors frontend AA-000 projection for workspace header labels. */
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
      return 'OPENED';
    case 'SUBMITTED':
    case 'CONFIRMATION_RECEIVED':
      return 'APPLIED';
    case 'WITHDRAWN':
      return 'ABANDONED';
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
}): WorkspaceStepStatus[] {
  const { hasAnalysis, application } = input;
  const analysisComplete = hasAnalysis;
  const fitComplete = application.matchScore != null || analysisComplete;
  const resumeComplete = Boolean(application.resumeVersionId);
  const openComplete = Boolean(
    application.externalConfirmationUrl ||
      application.status === 'ACTION_REQUIRED' ||
      application.status === 'SUBMITTED' ||
      application.status === 'CONFIRMATION_RECEIVED',
  );
  const doneComplete =
    application.status === 'SUBMITTED' || application.status === 'CONFIRMATION_RECEIVED';

  const completeById: Record<WorkspaceStepId, boolean> = {
    analysis: analysisComplete,
    fit: fitComplete,
    resume: resumeComplete,
    open: openComplete,
    done: doneComplete,
  };

  return WORKSPACE_STEP_IDS.map((id) => ({
    id,
    label: WORKSPACE_STEP_LABELS[id],
    complete: completeById[id],
  }));
}

export function buildWorkspaceDto(input: {
  application: JobApplicationDto;
  hasAnalysis: boolean;
  analysisSummary: AssistedApplyWorkspaceDto['analysisSummary'];
}): AssistedApplyWorkspaceDto {
  const viewState = toAssistedApplyViewState(input.application.status);
  const steps = computeWorkspaceSteps({
    hasAnalysis: input.hasAnalysis,
    application: input.application,
  });

  return {
    application: {
      id: input.application.id,
      jobId: input.application.jobId,
      jobTitle: input.application.jobTitle,
      company: input.application.companySlug,
      status: input.application.status,
    },
    viewState,
    viewLabel: labelForAssistedApplyViewState(viewState),
    steps,
    progressStep: (input.application.progressStep as WorkspaceStepId | null) ?? null,
    wasReopened: Boolean(input.application.reopenedAt),
    analysisSummary: input.analysisSummary,
    fit: { matchScore: input.application.matchScore },
    resume: input.application.resumeVersionId
      ? { resumeVersionId: input.application.resumeVersionId }
      : null,
    handoff: {
      externalConfirmationUrl: input.application.externalConfirmationUrl,
      submittedAt: input.application.submittedAt?.toISOString() ?? null,
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

export function firstIncompleteWorkspaceStep(
  steps: WorkspaceStepStatus[],
): WorkspaceStepId | null {
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
