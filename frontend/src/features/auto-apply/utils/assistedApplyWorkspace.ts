import type {
  AssistedApplyWorkspaceDto,
  WorkspaceStepId,
  WorkspaceStepStatusDto,
} from '@/features/auto-apply/types/autoApply.types';

export function isWorkspaceStepEnabled(
  steps: WorkspaceStepStatusDto[],
  stepId: WorkspaceStepId,
): boolean {
  const target = steps.find((s) => s.id === stepId);
  if (!target) return false;
  if (target.status === 'LOCKED') return false;
  if (target.complete) return true;

  const firstIncomplete = steps.find((s) => !s.complete);
  if (!firstIncomplete) return true;
  const targetIdx = steps.findIndex((s) => s.id === stepId);
  const incompleteIdx = steps.findIndex((s) => s.id === firstIncomplete.id);
  return targetIdx <= incompleteIdx;
}

export function resolveInitialWorkspaceStep(input: {
  steps: WorkspaceStepStatusDto[];
  explicitStep: string | null | undefined;
  progressStep: string | null | undefined;
}): WorkspaceStepId {
  const valid = new Set(input.steps.map((s) => s.id));
  if (input.explicitStep && valid.has(input.explicitStep as WorkspaceStepId)) {
    const id = input.explicitStep as WorkspaceStepId;
    if (isWorkspaceStepEnabled(input.steps, id)) return id;
  }
  if (input.progressStep && valid.has(input.progressStep as WorkspaceStepId)) {
    const id = input.progressStep as WorkspaceStepId;
    if (isWorkspaceStepEnabled(input.steps, id)) return id;
  }
  return (
    input.steps.find((s) => !s.complete)?.id ??
    input.steps[input.steps.length - 1]?.id ??
    'analysis'
  );
}

export function assistedApplyWorkspacePath(
  jobApplicationId: string,
  step?: WorkspaceStepId,
): string {
  const base = `/assisted-apply/${jobApplicationId}`;
  return step ? `${base}?step=${step}` : base;
}

export type WorkspaceEntrySignals = {
  possibleDuplicateCount: number;
  wasReopened: boolean;
};

const ENTRY_STORAGE_PREFIX = 'assisted-apply-entry:';

export function storeWorkspaceEntrySignals(
  jobApplicationId: string,
  signals: WorkspaceEntrySignals,
): void {
  try {
    sessionStorage.setItem(`${ENTRY_STORAGE_PREFIX}${jobApplicationId}`, JSON.stringify(signals));
  } catch {
    // ignore quota / private mode
  }
}

export function readWorkspaceEntrySignals(jobApplicationId: string): WorkspaceEntrySignals | null {
  try {
    const raw = sessionStorage.getItem(`${ENTRY_STORAGE_PREFIX}${jobApplicationId}`);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceEntrySignals;
  } catch {
    return null;
  }
}

export function clearWorkspaceEntryDuplicateSignal(jobApplicationId: string): void {
  const current = readWorkspaceEntrySignals(jobApplicationId);
  if (!current) return;
  storeWorkspaceEntrySignals(jobApplicationId, {
    ...current,
    possibleDuplicateCount: 0,
  });
}

export function workspaceFromDto(data: AssistedApplyWorkspaceDto): AssistedApplyWorkspaceDto {
  return data;
}
