export type WorkspaceStepId = 'analysis' | 'fit' | 'resume' | 'open' | 'done';

export interface WorkspaceStepStatus {
  id: WorkspaceStepId;
  label: string;
  complete: boolean;
}

export interface AssistedApplyWorkspaceDto {
  application: {
    id: string;
    jobId: string | null;
    jobTitle: string | null;
    company: string | null;
    status: string;
  };
  viewState: string;
  viewLabel: string;
  steps: WorkspaceStepStatus[];
  progressStep: WorkspaceStepId | null;
  wasReopened: boolean;
  analysisSummary: { id: string; outcomeStatus: string; analyzedAt: string } | null;
  fit: { matchScore: number | null } | null;
  resume: { resumeVersionId: string } | null;
  handoff: {
    externalConfirmationUrl: string | null;
    submittedAt: string | null;
    openedAt: string | null;
  } | null;
}

export const WORKSPACE_STEP_IDS: WorkspaceStepId[] = [
  'analysis',
  'fit',
  'resume',
  'open',
  'done',
];

export const WORKSPACE_STEP_LABELS: Record<WorkspaceStepId, string> = {
  analysis: 'Analysis',
  fit: 'Fit',
  resume: 'Resume',
  open: 'Open',
  done: 'Done',
};
