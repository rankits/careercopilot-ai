import { CURATED_SKILL_ALIASES, type CuratedSkillAlias } from '@/modules/recommendations/skills/skill-alias.catalog.js';

export interface CanonicalSkill {
  input: string;
  canonical: string;
  normalized: string;
  isAlias: boolean;
}

export const normalizeSkillKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '');

export class SkillCanonicalizationService {
  private readonly aliases = new Map<string, string>();

  constructor(entries: readonly CuratedSkillAlias[] = CURATED_SKILL_ALIASES) {
    for (const entry of entries) {
      const canonicalKey = normalizeSkillKey(entry.canonical);
      this.aliases.set(canonicalKey, entry.canonical);
      for (const alias of entry.aliases) {
        this.aliases.set(normalizeSkillKey(alias), entry.canonical);
      }
    }
  }

  canonicalize(skill: string): CanonicalSkill | null {
    const trimmed = skill.trim();
    if (!trimmed) return null;
    const normalized = normalizeSkillKey(trimmed);
    const canonical = this.aliases.get(normalized) ?? trimmed;
    return {
      input: trimmed,
      canonical,
      normalized: normalizeSkillKey(canonical),
      isAlias: canonical !== trimmed,
    };
  }

  canonicalizeList(skills: readonly string[]): CanonicalSkill[] {
    const seen = new Set<string>();
    const result: CanonicalSkill[] = [];
    for (const skill of skills) {
      const canonical = this.canonicalize(skill);
      if (!canonical || seen.has(canonical.normalized)) continue;
      seen.add(canonical.normalized);
      result.push(canonical);
    }
    return result;
  }
}

export const defaultSkillCanonicalizer = new SkillCanonicalizationService();

export const canonicalSkillOverlap = (
  required: readonly string[],
  available: readonly string[],
  canonicalizer = defaultSkillCanonicalizer,
): { ratio: number; matched: string[]; missing: string[] } => {
  const requiredCanonical = canonicalizer.canonicalizeList(required);
  if (requiredCanonical.length === 0) return { ratio: 1, matched: [], missing: [] };

  const availableKeys = new Set(
    canonicalizer.canonicalizeList(available).map((skill) => skill.normalized),
  );
  const matched = requiredCanonical
    .filter((skill) => availableKeys.has(skill.normalized))
    .map((skill) => skill.canonical);
  const missing = requiredCanonical
    .filter((skill) => !availableKeys.has(skill.normalized))
    .map((skill) => skill.canonical);

  return {
    ratio: matched.length / requiredCanonical.length,
    matched,
    missing,
  };
};
