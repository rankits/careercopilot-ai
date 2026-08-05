import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AutoApplyEventService } from '@/modules/auto-apply/services/audit-event.service.js';
import { IAutoApplyEventRepository } from '@/modules/auto-apply/contracts/audit-event.contract.js';
import { AutoApplyAuditEventDto } from '@/modules/auto-apply/types/audit-event.types.js';

describe('AutoApplyEventService', () => {
  let repository: IAutoApplyEventRepository;
  let service: AutoApplyEventService;

  const sampleEvent: AutoApplyAuditEventDto = {
    id: 'event-1',
    userId: 'user-1',
    jobApplicationId: 'jobapp-1',
    eventType: 'PLAN_CREATED',
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      record: vi.fn().mockResolvedValue(sampleEvent),
      findManyByUserId: vi.fn().mockResolvedValue([sampleEvent]),
    };
    service = new AutoApplyEventService(repository);
  });

  it('delegates recording to the repository', async () => {
    await service.record({ userId: 'user-1', eventType: 'PLAN_CREATED' });
    expect(repository.record).toHaveBeenCalledWith({ userId: 'user-1', eventType: 'PLAN_CREATED' });
  });

  it('never throws when the repository write fails — logging must not break the caller', async () => {
    vi.mocked(repository.record).mockRejectedValue(new Error('db unavailable'));

    await expect(
      service.record({ userId: 'user-1', eventType: 'SUBMISSION_APPROVED' }),
    ).resolves.toBeUndefined();
  });

  it('lists events scoped to the requesting user', async () => {
    const result = await service.listForUser('user-1');
    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1', 50, undefined);
    expect(result).toEqual([sampleEvent]);
  });

  it('honors a custom limit', async () => {
    await service.listForUser('user-1', 10);
    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1', 10, undefined);
  });

  it('passes jobApplicationId filter with userId scope (AA-044)', async () => {
    await service.listForUser('user-1', 50, { jobApplicationId: 'jobapp-1' });
    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1', 50, {
      jobApplicationId: 'jobapp-1',
    });
  });
});
