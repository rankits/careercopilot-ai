import { afterEach, describe, expect, it, vi } from 'vitest';

const { careerTarget } = vi.hoisted(() => ({
  careerTarget: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: { careerTarget },
  default: { careerTarget },
}));

import { prisma } from '@/shared/config/db.conf.js';
import { Prisma } from '@prisma/client';
import { prismaCareerTargetRepository } from '@/modules/recommendations/repositories/prisma-career-target.repository.js';

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'career-target-1',
  userId: 'user-1',
  goalText: 'Become a Staff Engineer',
  structured: { title: 'Staff Engineer' },
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});

const mockPrisma = () => (prisma as unknown as { careerTarget: typeof careerTarget }).careerTarget;

describe('prismaCareerTargetRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('findById delegates to findUnique', async () => {
    vi.mocked(mockPrisma().findUnique).mockResolvedValue(record());
    await expect(prismaCareerTargetRepository.findById('career-target-1')).resolves.toMatchObject({
      id: 'career-target-1',
    });
    expect(mockPrisma().findUnique).toHaveBeenCalledWith({ where: { id: 'career-target-1' } });
  });

  it('findOwned delegates to findFirst scoped by user and non-archived', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    await expect(
      prismaCareerTargetRepository.findOwned('user-1', 'career-target-1'),
    ).resolves.toMatchObject({ id: 'career-target-1' });
    expect(mockPrisma().findFirst).toHaveBeenCalledWith({
      where: { id: 'career-target-1', userId: 'user-1', archivedAt: null },
    });
  });

  it('listByUser clamps page and limit and returns a paged result', async () => {
    vi.mocked(mockPrisma().count).mockResolvedValue(1);
    vi.mocked(mockPrisma().findMany).mockResolvedValue([record()]);
    const result = await prismaCareerTargetRepository.listByUser('user-1', {
      page: 0,
      limit: 999,
    });
    expect(result).toEqual({
      items: [record()],
      page: 1,
      limit: 100,
      total: 1,
    });
    expect(mockPrisma().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  it('listByUser returns empty page for non-matching user', async () => {
    vi.mocked(mockPrisma().count).mockResolvedValue(0);
    vi.mocked(mockPrisma().findMany).mockResolvedValue([]);
    const result = await prismaCareerTargetRepository.listByUser('nobody', { page: 2, limit: 20 });
    expect(result.items).toEqual([]);
    expect(mockPrisma().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('create writes structured goals', async () => {
    vi.mocked(mockPrisma().create).mockResolvedValue(record({ goalText: 'Created' }));
    await prismaCareerTargetRepository.create({
      userId: 'user-1',
      goalText: 'Created',
      structured: { title: 'Staff' },
    });
    expect(mockPrisma().create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        goalText: 'Created',
        structured: { title: 'Staff' },
      },
    });
  });

  it('create writes empty structured object when none provided', async () => {
    vi.mocked(mockPrisma().create).mockResolvedValue(record());
    await prismaCareerTargetRepository.create({
      userId: 'user-1',
      goalText: 'Bare',
      structured: null,
    } as unknown as Parameters<typeof prismaCareerTargetRepository.create>[0]);
    const create = vi.mocked(mockPrisma().create).mock.calls[0][0];
    expect(create.data.structured).toEqual({});
    expect(create.data.goalText).toBe('Bare');
  });

  it('archiveOwned returns false when not owned', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(null);
    await expect(prismaCareerTargetRepository.archiveOwned('user-1', 'missing')).resolves.toBe(
      false,
    );
    expect(mockPrisma().update).not.toHaveBeenCalled();
  });

  it('archiveOwned sets archivedAt when owned', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    vi.mocked(mockPrisma().update).mockResolvedValue(record({ archivedAt: new Date() }));
    await expect(
      prismaCareerTargetRepository.archiveOwned('user-1', 'career-target-1'),
    ).resolves.toBe(true);
    const update = vi.mocked(mockPrisma().update).mock.calls[0][0];
    expect(update.where).toEqual({ id: 'career-target-1' });
    expect((update.data as { archivedAt: Date }).archivedAt).toBeInstanceOf(Date);
  });

  it('references Prisma type helper', () => {
    expect(Prisma).toBeDefined();
  });
});
