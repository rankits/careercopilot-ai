import { describe, expect, it } from 'vitest';

import type { WorkspaceStepStatusDto } from '@/features/auto-apply/types/autoApply.types';
import {
  isWorkspaceStepEnabled,
  resolveInitialWorkspaceStep,
} from '@/features/auto-apply/utils/assistedApplyWorkspace';

const steps: WorkspaceStepStatusDto[] = [
  { id: 'analysis', label: 'Analysis', complete: true },
  { id: 'fit', label: 'Fit', complete: true },
  { id: 'resume', label: 'Resume', complete: false },
  { id: 'open', label: 'Open', complete: false },
  { id: 'done', label: 'Done', complete: false },
];

describe('assistedApplyWorkspace utils (AA-040/AA-043)', () => {
  it('enables up through first incomplete step', () => {
    expect(isWorkspaceStepEnabled(steps, 'resume')).toBe(true);
    expect(isWorkspaceStepEnabled(steps, 'open')).toBe(false);
  });

  it('resolves explicit step over progress', () => {
    expect(
      resolveInitialWorkspaceStep({
        steps,
        explicitStep: 'fit',
        progressStep: 'resume',
      }),
    ).toBe('fit');
  });
});
