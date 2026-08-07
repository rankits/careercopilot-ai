import { describe, expect, it, vi } from 'vitest';

import { AssistedApplyWorkspaceService } from '@/modules/auto-apply/services/assisted-apply-workspace.service.js';

describe('AssistedApplyWorkspaceService progress gate', () => {
  it('blocks progress to open without a selected resume', async () => {
    const applications = {
      findById: vi.fn().mockResolvedValue({
        id: 'app-1',
        resumeVersionId: null,
        progressStep: 'resume',
      }),
      updateProgressStep: vi.fn(),
    };
    const service = new AssistedApplyWorkspaceService(
      applications as never,
      { findLatestByJobId: vi.fn() } as never,
    );

    await expect(service.updateProgressStep('user-1', 'app-1', 'open')).rejects.toMatchObject({
      code: 'RESUME_SELECTION_REQUIRED',
      statusCode: 400,
    });
    expect(applications.updateProgressStep).not.toHaveBeenCalled();
  });

  it('allows progress to open when a resume is selected (weak analysis irrelevant)', async () => {
    const applications = {
      findById: vi.fn().mockResolvedValue({
        id: 'app-1',
        resumeVersionId: 'rv-1',
        progressStep: 'resume',
      }),
      updateProgressStep: vi.fn().mockResolvedValue({
        id: 'app-1',
        resumeVersionId: 'rv-1',
        progressStep: 'open',
      }),
    };
    const service = new AssistedApplyWorkspaceService(
      applications as never,
      { findLatestByJobId: vi.fn() } as never,
    );

    const result = await service.updateProgressStep('user-1', 'app-1', 'open');
    expect(result.progressStep).toBe('open');
  });
});
