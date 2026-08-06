export type WorkspaceStepId = 'analysis' | 'fit' | 'resume' | 'open' | 'done';

export type WorkspaceStepStatusValue =
  'COMPLETE' | 'WARNING' | 'UNKNOWN' | 'CURRENT' | 'AVAILABLE' | 'LOCKED';

export interface WorkspaceStepStatus {
  id: WorkspaceStepId;
  label: string;
  complete: boolean;
  status?: WorkspaceStepStatusValue;
}

export interface AssistedApplyWorkspaceDto {
  application: {
    id: string;
    jobId: string | null;
    jobTitle: string | null;
    company: string | null;
    /** Display name from the canonical company record; falls back to the slug. */
    companyName: string | null;
    /** Remote / hybrid / onsite, when the canonical job records it. */
    workplaceMode: string | null;
    status: string;
  };
  viewState: string;
  viewLabel: string;
  steps: WorkspaceStepStatus[];
  progressStep: WorkspaceStepId | null;
  wasReopened: boolean;
  analysisSummary: {
    id: string;
    outcomeStatus: string;
    analyzedAt: string;
    status?: 'COMPLETE' | 'LIMITED' | 'FAILED';
  } | null;
  fit: {
    matchScore: number | null;
    /** Authoritative application-specific profile match (not recommendation cache). */
    profileMatch:
      import('@/modules/auto-apply/types/profile-job-match.types.js').ProfileJobMatchResult | null;
  } | null;
  resume: { resumeVersionId: string } | null;
  handoff: {
    externalConfirmationUrl: string | null;
    submittedAt: string | null;
    openedAt: string | null;
  } | null;
}

export const WORKSPACE_STEP_IDS: WorkspaceStepId[] = ['analysis', 'fit', 'resume', 'open', 'done'];

export const WORKSPACE_STEP_LABELS: Record<WorkspaceStepId, string> = {
  analysis: 'Analysis',
  fit: 'Fit & Eligibility',
  resume: 'Resume',
  open: 'Open Job Page',
  done: 'Track & Confirm',
};
