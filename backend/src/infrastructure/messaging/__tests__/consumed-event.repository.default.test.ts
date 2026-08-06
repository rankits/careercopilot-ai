import { describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock('@/shared/config/db.conf.js', () => ({ prisma: prismaMock }));

import { PrismaConsumedEventRepository } from '@/infrastructure/messaging/consumed-event.repository.js';

describe('PrismaConsumedEventRepository (default Prisma executor)', () => {
  it('claims a fresh event through the raw SQL executor', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ eventId: 'e1' }]);
    const repository = new PrismaConsumedEventRepository();

    await expect(repository.claim('e1', 'consumer', 'worker-a', 30_000)).resolves.toBe('ACQUIRED');
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('completes and releases through the raw SQL executor', async () => {
    prismaMock.$executeRaw.mockResolvedValue(1);
    const repository = new PrismaConsumedEventRepository();

    await expect(repository.complete('e1', 'consumer', 'worker-a')).resolves.toBe(true);
    await expect(repository.release('e1', 'consumer', 'worker-a')).resolves.toBe(true);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('returns false when complete or release changes no rows', async () => {
    prismaMock.$executeRaw.mockResolvedValue(0);
    const repository = new PrismaConsumedEventRepository();

    await expect(repository.complete('e1', 'consumer', 'worker-a')).resolves.toBe(false);
    await expect(repository.release('e1', 'consumer', 'worker-a')).resolves.toBe(false);
  });
});
