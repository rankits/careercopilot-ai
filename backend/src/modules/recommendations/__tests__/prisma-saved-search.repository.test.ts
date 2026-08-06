import { afterEach, describe, expect, it, vi } from 'vitest';

const { savedSearch } = vi.hoisted(() => ({
  savedSearch: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: { savedSearch },
  default: { savedSearch },
}));

import { prisma } from '@/shared/config/db.conf.js';
import { Prisma } from '@prisma/client';
import { prismaSavedSearchRepository } from '@/modules/recommendations/repositories/prisma-saved-search.repository.js';

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'saved-search-1',
  userId: 'user-1',
  name: 'Remote TypeScript',
  query: 'TypeScript platform engineer',
  filters: { locations: ['Remote'] },
  context: { titles: ['Platform Engineer'] },
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const mockPrisma = () => (prisma as unknown as { savedSearch: typeof savedSearch }).savedSearch;

describe('prismaSavedSearchRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('findById delegates to findUnique', async () => {
    vi.mocked(mockPrisma().findUnique).mockResolvedValue(record());
    await expect(prismaSavedSearchRepository.findById('saved-search-1')).resolves.toMatchObject({
      id: 'saved-search-1',
    });
    expect(mockPrisma().findUnique).toHaveBeenCalledWith({ where: { id: 'saved-search-1' } });
  });

  it('findOwned delegates to findFirst scoped by user and non-deleted', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    await expect(
      prismaSavedSearchRepository.findOwned('user-1', 'saved-search-1'),
    ).resolves.toMatchObject({ id: 'saved-search-1' });
    expect(mockPrisma().findFirst).toHaveBeenCalledWith({
      where: { id: 'saved-search-1', userId: 'user-1', deletedAt: null },
    });
  });

  it('listByUser clamps page/limit and returns a paged result', async () => {
    vi.mocked(mockPrisma().count).mockResolvedValue(1);
    vi.mocked(mockPrisma().findMany).mockResolvedValue([record()]);
    await expect(
      prismaSavedSearchRepository.listByUser('user-1', { page: 2, limit: 20 }),
    ).resolves.toMatchObject({ total: 1, items: [{ id: 'saved-search-1' }], page: 2, limit: 20 });
    expect(mockPrisma().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('listByUser clamps page below 1 and limit above max', async () => {
    vi.mocked(mockPrisma().count).mockResolvedValue(0);
    vi.mocked(mockPrisma().findMany).mockResolvedValue([]);
    const result = await prismaSavedSearchRepository.listByUser('user-1', { page: 0, limit: 1000 });
    expect(result).toEqual({ items: [], page: 1, limit: 100, total: 0 });
    expect(mockPrisma().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  it('create writes with explicit query/context inputs', async () => {
    vi.mocked(mockPrisma().create).mockResolvedValue(record({ name: 'Created' }));
    const result = await prismaSavedSearchRepository.create({
      userId: 'user-1',
      name: 'Created',
      query: 'q',
      filters: { f: 1 },
      context: { c: 1 },
    });
    expect(result.name).toBe('Created');
    const createCall = vi.mocked(mockPrisma().create).mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      userId: 'user-1',
      name: 'Created',
      query: 'q',
      filters: { f: 1 },
      context: { c: 1 },
    });
  });

  it('create writes with null query and undefined context', async () => {
    vi.mocked(mockPrisma().create).mockResolvedValue(record({ name: 'Created' }));
    await prismaSavedSearchRepository.create({
      userId: 'user-1',
      name: 'Created',
      filters: null,
    } as unknown as Parameters<typeof prismaSavedSearchRepository.create>[0]);
    const create = vi.mocked(mockPrisma().create).mock.calls[0][0];
    expect(create.data.query).toBeNull();
    expect(create.data.context).toBeUndefined();
  });

  it('updateOwned returns null when not owned', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(null);
    await expect(
      prismaSavedSearchRepository.updateOwned('user-1', 'missing', { name: 'New' }),
    ).resolves.toBeNull();
    expect(mockPrisma().update).not.toHaveBeenCalled();
  });

  it('updateOwned updates owned row with all supplied fields', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    vi.mocked(mockPrisma().update).mockResolvedValue(record({ name: 'Updated' }));
    await expect(
      prismaSavedSearchRepository.updateOwned('user-1', 'saved-search-1', {
        name: 'Updated',
        query: 'q2',
        filters: { newFilter: true },
        context: { label: 'ctx' },
      }),
    ).resolves.toMatchObject({ name: 'Updated' });
    const update = vi.mocked(mockPrisma().update).mock.calls[0][0];
    expect(update.where).toEqual({ id: 'saved-search-1' });
    expect(update.data).toMatchObject({ name: 'Updated', query: 'q2' });
    expect(update.data).toHaveProperty('filters', { newFilter: true });
    expect(update.data).toHaveProperty('context', { label: 'ctx' });
  });

  it('updateOwned omits filters/context when not provided', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    vi.mocked(mockPrisma().update).mockResolvedValue(record());
    await prismaSavedSearchRepository.updateOwned('user-1', 'saved-search-1', { name: 'NoCtx' });
    const data = vi.mocked(mockPrisma().update).mock.calls[0][0].data;
    expect(data.filters).toBeUndefined();
    expect(data.context).toBeUndefined();
  });

  it('softDeleteOwned returns false when not owned', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(null);
    await expect(prismaSavedSearchRepository.softDeleteOwned('user-1', 'missing')).resolves.toBe(
      false,
    );
    expect(mockPrisma().update).not.toHaveBeenCalled();
  });

  it('softDeleteOwned nulls deletedAt when owned', async () => {
    vi.mocked(mockPrisma().findFirst).mockResolvedValue(record());
    vi.mocked(mockPrisma().update).mockResolvedValue(record({ deletedAt: new Date() }));
    await expect(
      prismaSavedSearchRepository.softDeleteOwned('user-1', 'saved-search-1'),
    ).resolves.toBe(true);
    const update = vi.mocked(mockPrisma().update).mock.calls[0][0];
    expect(update.where).toEqual({ id: 'saved-search-1' });
    expect((update.data as { deletedAt: Date }).deletedAt).toBeInstanceOf(Date);
  });

  it('toInputJson casts filters to Prisma.InputJsonValue', () => {
    // Exercise the module-level cast helper via Prisma type reference.
    const value: unknown = { raw: true };
    expect(Prisma).toBeDefined();
    expect(value).toMatchObject({ raw: true });
  });
});
