import type { PrismaClient } from '@prisma/client';
import { CURATED_SKILL_ALIASES } from '@/modules/recommendations/skills/skill-alias.catalog.js';
import { normalizeSkillKey } from '@/modules/recommendations/skills/skill-canonicalization.service.js';
import { CURATED_SKILL_RELATIONSHIPS } from '@/modules/recommendations/skills/skill-relationship.catalog.js';

async function upsertCanonicalSkill(prisma: PrismaClient, name: string): Promise<{ id: string }> {
  return prisma.skillCanonical.upsert({
    where: { normalizedName: normalizeSkillKey(name) },
    update: { name },
    create: {
      name,
      normalizedName: normalizeSkillKey(name),
    },
    select: { id: true },
  });
}

export async function seedSkillAliases(prisma: PrismaClient): Promise<void> {
  let aliasCount = 0;

  for (const entry of CURATED_SKILL_ALIASES) {
    const canonical = await upsertCanonicalSkill(prisma, entry.canonical);

    for (const alias of entry.aliases) {
      await prisma.skillAlias.upsert({
        where: { normalizedAlias: normalizeSkillKey(alias) },
        update: {
          alias,
          canonicalId: canonical.id,
        },
        create: {
          alias,
          normalizedAlias: normalizeSkillKey(alias),
          canonicalId: canonical.id,
        },
      });
      aliasCount++;
    }
  }

  let relationshipCount = 0;
  for (const entry of CURATED_SKILL_RELATIONSHIPS) {
    const [fromSkill, toSkill] = await Promise.all([
      upsertCanonicalSkill(prisma, entry.from),
      upsertCanonicalSkill(prisma, entry.to),
    ]);
    await prisma.skillRelationship.upsert({
      where: {
        fromSkillId_toSkillId_type: {
          fromSkillId: fromSkill.id,
          toSkillId: toSkill.id,
          type: entry.type,
        },
      },
      update: {},
      create: {
        fromSkillId: fromSkill.id,
        toSkillId: toSkill.id,
        type: entry.type,
      },
    });
    relationshipCount++;
  }

  console.log(
    `Seeded ${CURATED_SKILL_ALIASES.length} canonical skills, ${aliasCount} aliases, and ${relationshipCount} skill relationships`,
  );
}
