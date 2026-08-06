import { beforeEach, describe, expect, it, vi } from 'vitest';

const { normalizeSkillKey } = vi.hoisted(() => ({
  normalizeSkillKey: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock('@/modules/recommendations/skills/skill-alias.catalog.js', () => ({
  CURATED_SKILL_ALIASES: [
    { canonical: 'JavaScript', aliases: ['JS', 'ECMAScript'] },
    { canonical: 'TypeScript', aliases: ['TS'] },
  ],
}));
vi.mock('@/modules/recommendations/skills/skill-relationship.catalog.js', () => ({
  CURATED_SKILL_RELATIONSHIPS: [{ from: 'JavaScript', to: 'TypeScript', type: 'RELATED' }],
}));
vi.mock('@/modules/recommendations/skills/skill-canonicalization.service.js', () => ({
  normalizeSkillKey,
}));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
}));

import { seedSkillAliases } from '@/seed/seed/skills.seed.js';

const canonicalUpsertMock = vi.fn();
const aliasUpsertMock = vi.fn();
const relationshipUpsertMock = vi.fn();

const createPrisma = (): unknown => ({
  skillCanonical: { upsert: canonicalUpsertMock },
  skillAlias: { upsert: aliasUpsertMock },
  skillRelationship: { upsert: relationshipUpsertMock },
});

describe('seedSkillAliases', () => {
  beforeEach(() => {
    canonicalUpsertMock.mockReset();
    aliasUpsertMock.mockReset();
    relationshipUpsertMock.mockReset();
    normalizeSkillKey.mockClear();
  });

  it('upserts canonical skills, aliases, and relationships', async () => {
    canonicalUpsertMock
      .mockResolvedValueOnce({ id: 'js' })
      .mockResolvedValueOnce({ id: 'ts' })
      .mockResolvedValueOnce({ id: 'js' })
      .mockResolvedValueOnce({ id: 'ts' });
    aliasUpsertMock.mockResolvedValue({ id: 'alias' });
    relationshipUpsertMock.mockResolvedValue({ id: 'rel' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma();

    await seedSkillAliases(prisma as never);

    expect(canonicalUpsertMock).toHaveBeenCalledTimes(4);
    expect(aliasUpsertMock).toHaveBeenCalledTimes(3);

    expect(aliasUpsertMock).toHaveBeenNthCalledWith(1, {
      where: { normalizedAlias: 'js' },
      update: { alias: 'JS', canonicalId: 'js' },
      create: { alias: 'JS', normalizedAlias: 'js', canonicalId: 'js' },
    });

    expect(relationshipUpsertMock).toHaveBeenCalledTimes(1);
    expect(relationshipUpsertMock).toHaveBeenCalledWith({
      where: {
        fromSkillId_toSkillId_type: {
          fromSkillId: 'js',
          toSkillId: 'ts',
          type: 'RELATED',
        },
      },
      update: {},
      create: { fromSkillId: 'js', toSkillId: 'ts', type: 'RELATED' },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Seeded 2 canonical skills, 3 aliases, and 1 skill relationships',
    );
    consoleSpy.mockRestore();
  });
});
