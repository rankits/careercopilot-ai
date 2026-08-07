import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDiagnosticsService } from '@/modules/auto-apply/services/admin-diagnostics.service.js';
import { IAdminDiagnosticsRepository } from '@/modules/auto-apply/contracts/admin-diagnostics.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IAutoApplyEventService } from '@/modules/auto-apply/contracts/audit-event.contract.js';

describe('AdminDiagnosticsService', () => {
  let repository: IAdminDiagnosticsRepository;
  let attemptRepo: ISubmissionAttemptRepository;
  let eventService: IAutoApplyEventService;
  let service: AdminDiagnosticsService;

  const staleUpdatedAt = new Date(Date.now() - 20 * 60_000);

  beforeEach(() => {
    repository = {
      findStuckSubmissions: vi.fn().mockResolvedValue([]),
      findSubmittingOlderThan: vi.fn().mockResolvedValue([]),
      reclaimSubmittingIfStuck: vi.fn().mockResolvedValue(null),
    };
    attemptRepo = {
      countByJobApplicationId: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: 'attempt-1',
        jobApplicationId: 'ja-1',
        attemptNumber: 1,
        outcome: 'FAILED_DO_NOT_RETRY',
        errorCode: 'STUCK_TIMEOUT',
        errorMessage: '…',
        startedAt: new Date(),
        completedAt: new Date(),
      }),
      findLatest: vi.fn(),
    };
    eventService = {
      record: vi.fn().mockResolvedValue(undefined),
      listForUser: vi.fn(),
    };
    service = new AdminDiagnosticsService(repository, attemptRepo, eventService);
  });

  it('applies default thresholds when none are provided', async () => {
    await service.getStuckSubmissions();
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 15,
      awaitingConfirmationAfterDays: 7,
    });
  });

  it('overrides only the thresholds explicitly provided', async () => {
    await service.getStuckSubmissions({ queueStalledAfterMinutes: 30 });
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 30,
      awaitingConfirmationAfterDays: 7,
    });
  });

  it('falls back to defaults even when the caller passes both keys as explicit undefined (the real controller always does this)', async () => {
    await service.getStuckSubmissions({
      queueStalledAfterMinutes: undefined,
      awaitingConfirmationAfterDays: undefined,
    });
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 15,
      awaitingConfirmationAfterDays: 7,
    });
  });

  describe('reclaimStuckSubmissions (AA-007)', () => {
    it('reclaims a SUBMITTING row older than the threshold with attempt + audit', async () => {
      vi.mocked(repository.findSubmittingOlderThan).mockResolvedValue([
        { id: 'ja-1', userId: 'user-1', updatedAt: staleUpdatedAt },
      ]);
      vi.mocked(repository.reclaimSubmittingIfStuck).mockResolvedValue({
        id: 'ja-1',
        userId: 'user-1',
        updatedAt: new Date(),
      });

      const result = await service.reclaimStuckSubmissions({ submittingOlderThanMinutes: 15 });

      expect(result).toEqual({ reclaimed: 1, jobApplicationIds: ['ja-1'] });
      expect(repository.reclaimSubmittingIfStuck).toHaveBeenCalledWith(
        'ja-1',
        expect.any(Date),
        'STUCK_TIMEOUT',
        expect.stringContaining('reclaimed'),
      );
      expect(attemptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobApplicationId: 'ja-1',
          attemptNumber: 1,
          outcome: 'FAILED_DO_NOT_RETRY',
          errorCode: 'STUCK_TIMEOUT',
        }),
      );
      expect(eventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: 'SUBMISSION_RECLAIMED',
          jobApplicationId: 'ja-1',
          metadata: expect.objectContaining({
            attemptNumber: 1,
            failureCode: 'STUCK_TIMEOUT',
            staleForMinutes: expect.any(Number),
          }),
        }),
      );
    });

    it('does not reclaim when the CAS loses to a live finalize (race)', async () => {
      vi.mocked(repository.findSubmittingOlderThan).mockResolvedValue([
        { id: 'ja-1', userId: 'user-1', updatedAt: staleUpdatedAt },
      ]);
      vi.mocked(repository.reclaimSubmittingIfStuck).mockResolvedValue(null);

      const result = await service.reclaimStuckSubmissions();

      expect(result).toEqual({ reclaimed: 0, jobApplicationIds: [] });
      expect(attemptRepo.create).not.toHaveBeenCalled();
      expect(eventService.record).not.toHaveBeenCalled();
    });

    it('skips candidates that are no longer reclaimable on a repeat call', async () => {
      vi.mocked(repository.findSubmittingOlderThan).mockResolvedValue([]);

      const result = await service.reclaimStuckSubmissions();

      expect(result).toEqual({ reclaimed: 0, jobApplicationIds: [] });
      expect(repository.reclaimSubmittingIfStuck).not.toHaveBeenCalled();
    });

    it('continues reclaiming other rows when one row fails unexpectedly', async () => {
      vi.mocked(repository.findSubmittingOlderThan).mockResolvedValue([
        { id: 'ja-fail', userId: 'user-1', updatedAt: staleUpdatedAt },
        { id: 'ja-ok', userId: 'user-2', updatedAt: staleUpdatedAt },
      ]);
      vi.mocked(repository.reclaimSubmittingIfStuck)
        .mockRejectedValueOnce(new Error('db blip'))
        .mockResolvedValueOnce({
          id: 'ja-ok',
          userId: 'user-2',
          updatedAt: new Date(),
        });

      const result = await service.reclaimStuckSubmissions();

      expect(result).toEqual({ reclaimed: 1, jobApplicationIds: ['ja-ok'] });
      expect(eventService.record).toHaveBeenCalledWith(
        expect.objectContaining({ jobApplicationId: 'ja-ok', eventType: 'SUBMISSION_RECLAIMED' }),
      );
    });

    it('numbers attempts from prior count (AA-005 numbering)', async () => {
      vi.mocked(repository.findSubmittingOlderThan).mockResolvedValue([
        { id: 'ja-1', userId: 'user-1', updatedAt: staleUpdatedAt },
      ]);
      vi.mocked(repository.reclaimSubmittingIfStuck).mockResolvedValue({
        id: 'ja-1',
        userId: 'user-1',
        updatedAt: new Date(),
      });
      vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValue(2);

      await service.reclaimStuckSubmissions();

      expect(attemptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 3 }),
      );
      expect(eventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ attemptNumber: 3 }),
        }),
      );
    });

    it('uses default threshold of 15 minutes when omitted', async () => {
      const before = Date.now();
      await service.reclaimStuckSubmissions();
      const after = Date.now();

      expect(repository.findSubmittingOlderThan).toHaveBeenCalledTimes(1);
      const cutoff = vi.mocked(repository.findSubmittingOlderThan).mock.calls[0][0] as Date;
      const ageMs = after - cutoff.getTime();
      // ~15 minutes, allow clock skew from the call window
      expect(ageMs).toBeGreaterThanOrEqual(15 * 60_000 - (after - before) - 50);
      expect(ageMs).toBeLessThanOrEqual(15 * 60_000 + 50);
    });
  });
});
