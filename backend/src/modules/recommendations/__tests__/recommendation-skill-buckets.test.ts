import { describe, expect, it } from 'vitest';
import { normalizeRecommendationSkillBuckets } from '@/modules/recommendations/skills/recommendation-skill-buckets.js';

describe('normalizeRecommendationSkillBuckets', () => {
  it('canonicalizes labels and applies exact alias related transferable missing priority', () => {
    const buckets = normalizeRecommendationSkillBuckets({
      matchedSkills: ['typescript', 'React'],
      aliasSkills: ['TypeScript', 'NodeJS'],
      relatedSkills: ['ReactJS', 'NextJS'],
      transferableSkills: ['Node.js', 'JavaScript'],
      missingSkills: ['TypeScript', 'Node.js', 'Next.js', 'JavaScript', 'Redis'],
    });

    expect(buckets).toEqual({
      matchedSkills: ['TypeScript', 'React'],
      aliasSkills: ['Node.js'],
      relatedSkills: ['Next.js'],
      transferableSkills: ['JavaScript'],
      missingSkills: ['Redis'],
    });
  });
});
