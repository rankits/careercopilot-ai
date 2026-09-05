import { defaultSkillCanonicalizer } from '@/modules/recommendations/skills/skill-canonicalization.service.js';

export interface RecommendationSkillBuckets {
  matchedSkills: string[];
  aliasSkills: string[];
  relatedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
}

const normalizeBucket = (skills: readonly string[]): Array<{ key: string; label: string }> =>
  skills.flatMap((skill) => {
    const canonical = defaultSkillCanonicalizer.canonicalize(skill);
    return canonical ? [{ key: canonical.normalized, label: canonical.canonical }] : [];
  });

export const normalizeRecommendationSkillBuckets = (
  buckets: RecommendationSkillBuckets,
): RecommendationSkillBuckets => {
  const seen = new Set<string>();

  const pick = (skills: readonly string[]): string[] => {
    const result: string[] = [];
    for (const skill of normalizeBucket(skills)) {
      if (seen.has(skill.key)) continue;
      seen.add(skill.key);
      result.push(skill.label);
    }
    return result;
  };

  return {
    matchedSkills: pick(buckets.matchedSkills),
    aliasSkills: pick(buckets.aliasSkills),
    relatedSkills: pick(buckets.relatedSkills),
    transferableSkills: pick(buckets.transferableSkills),
    missingSkills: pick(buckets.missingSkills),
  };
};
