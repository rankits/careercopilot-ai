import {
  defaultSkillCanonicalizer,
  type CanonicalSkill,
  type SkillCanonicalizationService,
} from '@/modules/recommendations/skills/skill-canonicalization.service.js';
import {
  CURATED_SKILL_RELATIONSHIPS,
  type CuratedSkillRelationship,
  type SkillRelationshipType,
} from '@/modules/recommendations/skills/skill-relationship.catalog.js';

const RELATIONSHIP_CREDIT: Record<SkillRelationshipType, number> = {
  RELATED: 0.65,
  TRANSFERABLE: 0.35,
};

export interface SkillRelationshipHit {
  requiredSkill: string;
  availableSkill: string;
  type: SkillRelationshipType;
}

export interface SkillGraphOverlap {
  ratio: number;
  exact: string[];
  related: string[];
  transferable: string[];
  missing: string[];
  hits: SkillRelationshipHit[];
}

export class SkillRelationshipService {
  private readonly relationships = new Map<string, Map<string, SkillRelationshipType>>();

  constructor(
    private readonly canonicalizer: SkillCanonicalizationService = defaultSkillCanonicalizer,
    entries: readonly CuratedSkillRelationship[] = CURATED_SKILL_RELATIONSHIPS,
  ) {
    for (const entry of entries) {
      const from = this.canonicalizer.canonicalize(entry.from);
      const to = this.canonicalizer.canonicalize(entry.to);
      if (!from || !to || from.normalized === to.normalized) continue;
      const relationshipsByTarget = this.relationships.get(from.normalized) ?? new Map();
      relationshipsByTarget.set(to.normalized, entry.type);
      this.relationships.set(from.normalized, relationshipsByTarget);
    }
  }

  findRelationship(required: CanonicalSkill, available: CanonicalSkill): SkillRelationshipType | null {
    return this.relationships.get(required.normalized)?.get(available.normalized) ?? null;
  }

  overlap(required: readonly string[], available: readonly string[]): SkillGraphOverlap {
    const requiredCanonical = this.canonicalizer.canonicalizeList(required);
    if (requiredCanonical.length === 0) {
      return { ratio: 1, exact: [], related: [], transferable: [], missing: [], hits: [] };
    }

    const availableCanonical = this.canonicalizer.canonicalizeList(available);
    const availableByKey = new Map(availableCanonical.map((skill) => [skill.normalized, skill]));
    const exact: string[] = [];
    const related: string[] = [];
    const transferable: string[] = [];
    const missing: string[] = [];
    const hits: SkillRelationshipHit[] = [];
    let weightedHits = 0;

    for (const requiredSkill of requiredCanonical) {
      const exactHit = availableByKey.get(requiredSkill.normalized);
      if (exactHit) {
        exact.push(requiredSkill.canonical);
        weightedHits += 1;
        continue;
      }

      const relationshipHit = this.findBestRelationship(requiredSkill, availableCanonical);
      if (relationshipHit) {
        const target = relationshipHit.available.canonical;
        if (relationshipHit.type === 'RELATED') related.push(target);
        else transferable.push(target);
        hits.push({
          requiredSkill: requiredSkill.canonical,
          availableSkill: target,
          type: relationshipHit.type,
        });
        weightedHits += RELATIONSHIP_CREDIT[relationshipHit.type];
        continue;
      }

      missing.push(requiredSkill.canonical);
    }

    return {
      ratio: weightedHits / requiredCanonical.length,
      exact,
      related,
      transferable,
      missing,
      hits,
    };
  }

  private findBestRelationship(
    required: CanonicalSkill,
    available: readonly CanonicalSkill[],
  ): { available: CanonicalSkill; type: SkillRelationshipType } | null {
    let transferable: { available: CanonicalSkill; type: SkillRelationshipType } | null = null;
    for (const availableSkill of available) {
      const type = this.findRelationship(required, availableSkill);
      if (type === 'RELATED') return { available: availableSkill, type };
      if (type === 'TRANSFERABLE' && !transferable) {
        transferable = { available: availableSkill, type };
      }
    }
    return transferable;
  }
}

export const defaultSkillRelationshipService = new SkillRelationshipService();
