import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssistedApplyHandoffService } from '@/modules/auto-apply/services/assisted-apply-handoff.service.js';

describe('AssistedApplyHandoffService (AA-070)', () => {
  const userId = 'user-1';
  const appId = 'app-1';
  const jobId = 'job-1';

  let applications: {
    findById: ReturnType<typeof vi.fn>;
    recordHandoffOpened: ReturnType<typeof vi.fn>;
  };
  let channelJobLookup: { findJobChannelSnapshot: ReturnType<typeof vi.fn> };
  let readiness: { evaluate: ReturnType<typeof vi.fn> };
  let queuePublish: { publish: ReturnType<typeof vi.fn> };
  let service: AssistedApplyHandoffService;

  const baseApp = {
    id: appId,
    userId,
    jobId,
    status: 'READY_FOR_REVIEW' as const,
    handoffOpenedAt: null,
    appliedNotes: null,
    abandonReason: null,
    abandonNote: null,
    externalConfirmationUrl: null,
    resumeVersionId: 'rv-1',
  };

  beforeEach(() => {
    applications = {
      findById: vi.fn().mockResolvedValue(baseApp),
      recordHandoffOpened: vi.fn().mockImplementation(async (_u, _id, data) => ({
        ...baseApp,
        status: 'ACTION_REQUIRED',
        handoffOpenedAt: data.openedAt,
        externalConfirmationUrl: data.applyUrl,
      })),
    };
    channelJobLookup = {
      findJobChannelSnapshot: vi.fn().mockResolvedValue({
        id: jobId,
        status: 'ACTIVE',
        applyUrl: 'https://boards.example.com/jobs/1/apply',
      }),
    };
    readiness = {
      evaluate: vi.fn().mockResolvedValue({
        ready: true,
        blockingReasons: [],
        warnings: [],
      }),
    };
    queuePublish = { publish: vi.fn() };
    service = new AssistedApplyHandoffService(
      applications as never,
      channelJobLookup as never,
      readiness as never,
      queuePublish,
    );
  });

  it('transitions without calling queue publish', async () => {
    const result = await service.handoff(userId, appId, 'op-1');
    expect(result.viewState).toBe('OPENED');
    expect(result.applyUrl).toContain('https://boards.example.com');
    expect(queuePublish.publish).not.toHaveBeenCalled();
    expect(applications.recordHandoffOpened).toHaveBeenCalled();
    expect(readiness.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'HANDOFF', applyMode: 'ASSISTED' }),
    );
  });

  it('returns HANDOFF_BLOCKED when readiness has blocking reasons', async () => {
    readiness.evaluate.mockResolvedValue({
      ready: false,
      blockingReasons: [{ code: 'JOB_NOT_ACTIVE', message: 'Job closed' }],
      warnings: [],
    });
    await expect(service.handoff(userId, appId)).rejects.toMatchObject({
      code: 'HANDOFF_BLOCKED',
      statusCode: 409,
    });
    expect(applications.recordHandoffOpened).not.toHaveBeenCalled();
    expect(queuePublish.publish).not.toHaveBeenCalled();
  });

  it('is idempotent when already ACTION_REQUIRED with handoffOpenedAt', async () => {
    const openedAt = new Date('2026-08-05T12:00:00Z');
    applications.findById.mockResolvedValue({
      ...baseApp,
      status: 'ACTION_REQUIRED',
      handoffOpenedAt: openedAt,
      externalConfirmationUrl: 'https://boards.example.com/jobs/1/apply',
    });
    const result = await service.handoff(userId, appId);
    expect(result.openedAt).toBe(openedAt.toISOString());
    expect(applications.recordHandoffOpened).not.toHaveBeenCalled();
  });

  it('rejects WITHDRAWN / SUBMITTED with CONFLICT', async () => {
    applications.findById.mockResolvedValue({ ...baseApp, status: 'WITHDRAWN' });
    await expect(service.handoff(userId, appId)).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      statusCode: 409,
    });
  });

  it('rejects private/localhost apply URLs', async () => {
    channelJobLookup.findJobChannelSnapshot.mockResolvedValue({
      id: jobId,
      status: 'ACTIVE',
      applyUrl: 'http://127.0.0.1/apply',
    });
    await expect(service.handoff(userId, appId)).rejects.toMatchObject({
      code: 'INVALID_APPLY_URL',
      statusCode: 422,
    });
  });
});
