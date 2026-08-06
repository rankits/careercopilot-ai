import { describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock('@/shared/config/db.conf.js', () => ({ prisma: prismaMock }));

import { PrismaOutboxRepository } from '@/infrastructure/outbox/outbox.repository.js';

const row = {
  id: 'e1',
  aggregateId: 'a1',
  eventType: 'jobs.semantic-content.changed.v1',
  payload: { jobId: 'j1' },
  attemptCount: 1,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('PrismaOutboxRepository (default Prisma executor)', () => {
  it('claims a batch through the raw SQL executor', async () => {
    prismaMock.$queryRaw.mockResolvedValue([row]);
    const repository = new PrismaOutboxRepository();

    const claimed = await repository.claimBatch({
      workerId: 'worker-a',
      batchSize: 25,
      maxAttempts: 10,
      lockTimeoutMs: 60_000,
    });

    expect(claimed).toEqual([row]);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('routes markPublished/scheduleRetry/markFailed through the raw SQL executor', async () => {
    prismaMock.$executeRaw.mockResolvedValue(1);
    const repository = new PrismaOutboxRepository();

    await expect(repository.markPublished('e1', 'worker-a', new Date())).resolves.toBe(true);
    await expect(repository.scheduleRetry('e1', 'worker-a', new Date(), 'boom')).resolves.toBe(
      true,
    );
    await expect(repository.markFailed('e1', 'worker-a', 'boom')).resolves.toBe(true);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('returns false when an update changes no rows', async () => {
    prismaMock.$executeRaw.mockResolvedValue(0);
    const repository = new PrismaOutboxRepository();

    await expect(repository.markPublished('e1', 'worker-a', new Date())).resolves.toBe(false);
    await expect(repository.scheduleRetry('e1', 'worker-a', new Date(), 'x')).resolves.toBe(false);
    await expect(repository.markFailed('e1', 'worker-a', 'x')).resolves.toBe(false);
  });
});

describe('PrismaOutboxRepository claim validation', () => {
  it('rejects a non-positive batchSize', async () => {
    const repository = new PrismaOutboxRepository();
    await expect(
      repository.claimBatch({ workerId: 'w', batchSize: 0, maxAttempts: 5, lockTimeoutMs: 100 }),
    ).rejects.toThrow('batchSize must be a positive integer');
  });

  it('rejects a non-integer maxAttempts', async () => {
    const repository = new PrismaOutboxRepository();
    await expect(
      repository.claimBatch({ workerId: 'w', batchSize: 5, maxAttempts: 1.5, lockTimeoutMs: 100 }),
    ).rejects.toThrow('maxAttempts must be a positive integer');
  });

  it('rejects a non-positive lockTimeoutMs', async () => {
    const repository = new PrismaOutboxRepository();
    await expect(
      repository.claimBatch({ workerId: 'w', batchSize: 5, maxAttempts: 5, lockTimeoutMs: 0 }),
    ).rejects.toThrow('lockTimeoutMs must be a positive integer');
  });

  it('rejects a blank workerId', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const repository = new PrismaOutboxRepository();
    await expect(
      repository.claimBatch({ workerId: '   ', batchSize: 5, maxAttempts: 5, lockTimeoutMs: 100 }),
    ).rejects.toThrow('workerId is required');
  });
});
