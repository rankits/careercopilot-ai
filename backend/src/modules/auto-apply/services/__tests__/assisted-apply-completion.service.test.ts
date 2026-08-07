import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssistedApplyCompletionService } from '@/modules/auto-apply/services/assisted-apply-completion.service.js';

vi.mock('@/modules/auto-apply/controllers/audit-event.controller.js', () => ({
  autoApplyEventService: { record: vi.fn().mockResolvedValue(undefined) },
}));

describe('AssistedApplyCompletionService (AA-072/073/074)', () => {
  const userId = 'user-1';
  const appId = 'app-1';

  let applications: {
    findById: ReturnType<typeof vi.fn>;
    markApplied: ReturnType<typeof vi.fn>;
    abandonApplication: ReturnType<typeof vi.fn>;
    updateAppliedDetails: ReturnType<typeof vi.fn>;
  };
  let service: AssistedApplyCompletionService;

  beforeEach(() => {
    applications = {
      findById: vi.fn(),
      markApplied: vi.fn(),
      abandonApplication: vi.fn(),
      updateAppliedDetails: vi.fn(),
    };
    service = new AssistedApplyCompletionService(applications as never);
  });

  describe('markApplied', () => {
    it('requires OPENED (ACTION_REQUIRED + handoffOpenedAt)', async () => {
      applications.findById.mockResolvedValue({
        id: appId,
        status: 'READY_FOR_REVIEW',
        handoffOpenedAt: null,
      });
      await expect(service.markApplied(userId, appId)).rejects.toMatchObject({
        code: 'INVALID_STATE',
        statusCode: 409,
        message: 'Open the application before marking as applied.',
      });
    });

    it('transitions OPENED → APPLIED', async () => {
      const openedAt = new Date();
      applications.findById.mockResolvedValue({
        id: appId,
        status: 'ACTION_REQUIRED',
        handoffOpenedAt: openedAt,
        appliedNotes: null,
      });
      applications.markApplied.mockResolvedValue({
        id: appId,
        status: 'SUBMITTED',
        submittedAt: openedAt,
      });
      const result = await service.markApplied(userId, appId, { notes: 'ok' });
      expect(result.status).toBe('APPLIED');
      expect(applications.markApplied).toHaveBeenCalled();
    });

    it('is idempotent when already SUBMITTED', async () => {
      applications.findById.mockResolvedValue({
        id: appId,
        status: 'SUBMITTED',
        submittedAt: new Date('2026-08-01'),
        appliedNotes: 'old',
      });
      applications.updateAppliedDetails.mockResolvedValue({
        id: appId,
        status: 'SUBMITTED',
        submittedAt: new Date('2026-08-01'),
        appliedNotes: 'new',
      });
      const result = await service.markApplied(userId, appId, { notes: 'new' });
      expect(result.status).toBe('APPLIED');
      expect(applications.markApplied).not.toHaveBeenCalled();
    });
  });

  describe('abandon', () => {
    it('rejects invalid reason', async () => {
      await expect(
        service.abandon(userId, appId, { reasonCode: 'NOPE' }),
      ).rejects.toMatchObject({ code: 'INVALID_ABANDON_REASON', statusCode: 400 });
    });

    it('blocks abandon from SUBMITTED', async () => {
      applications.findById.mockResolvedValue({ id: appId, status: 'SUBMITTED' });
      await expect(
        service.abandon(userId, appId, { reasonCode: 'NOT_INTERESTED' }),
      ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION', statusCode: 409 });
    });

    it('withdraws with reason', async () => {
      applications.findById.mockResolvedValue({ id: appId, status: 'ACTION_REQUIRED' });
      applications.abandonApplication.mockResolvedValue({
        id: appId,
        status: 'WITHDRAWN',
        abandonReason: 'BROKEN_LINK',
      });
      const result = await service.abandon(userId, appId, {
        reasonCode: 'BROKEN_LINK',
        note: '404',
      });
      expect(result).toEqual({ status: 'WITHDRAWN', abandonReason: 'BROKEN_LINK' });
    });
  });

  describe('reportBrokenLink', () => {
    it('records without status change', async () => {
      applications.findById.mockResolvedValue({ id: appId, status: 'ACTION_REQUIRED' });
      const result = await service.reportBrokenLink(userId, appId);
      expect(result.reported).toBe(true);
      expect(result.reportedAt).toBeTruthy();
    });
  });
});
