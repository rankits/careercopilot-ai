import type { PrismaClient } from '@prisma/client';
import { CURATED_SKILL_ALIASES } from '@/modules/recommendations/skills/skill-alias.catalog.js';
import { normalizeSkillKey } from '@/modules/recommendations/skills/skill-canonicalization.service.js';

export async function seedSkillAliases(prisma: PrismaClient): Promise<void> {
  let aliasCount = 0;

  for (const entry of CURATED_SKILL_ALIASES) {
    const canonical = await prisma.skillCanonical.upsert({
      where: { normalizedName: normalizeSkillKey(entry.canonical) },
      update: { name: entry.canonical },
      create: {
        name: entry.canonical,
        normalizedName: normalizeSkillKey(entry.canonical),
      },
    });

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

  console.log(`Seeded ${CURATED_SKILL_ALIASES.length} canonical skills and ${aliasCount} aliases`);
}
