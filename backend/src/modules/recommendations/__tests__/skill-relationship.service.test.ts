import { describe, expect, it } from 'vitest';
import { defaultSkillRelationshipService } from '@/modules/recommendations/skills/skill-relationship.service.js';

describe('SkillRelationshipService', () => {
  it('gives partial related credit without counting the skill as exact', () => {
    const overlap = defaultSkillRelationshipService.overlap(['React'], ['NextJS']);

    expect(overlap.ratio).toBe(0.65);
    expect(overlap.exact).toEqual([]);
    expect(overlap.related).toEqual(['Next.js']);
    expect(overlap.transferable).toEqual([]);
    expect(overlap.missing).toEqual([]);
    expect(overlap.hits).toEqual([
      { requiredSkill: 'React', availableSkill: 'Next.js', type: 'RELATED' },
    ]);
  });

  it('gives lower transferable credit and keeps it out of related matches', () => {
    const overlap = defaultSkillRelationshipService.overlap(['TypeScript'], ['JavaScript']);

    expect(overlap.ratio).toBe(0.35);
    expect(overlap.exact).toEqual([]);
    expect(overlap.related).toEqual([]);
    expect(overlap.transferable).toEqual(['JavaScript']);
    expect(overlap.missing).toEqual([]);
  });

  it('prefers exact matches over graph relationships', () => {
    const overlap = defaultSkillRelationshipService.overlap(['React'], ['ReactJS', 'Next.js']);

    expect(overlap.ratio).toBe(1);
    expect(overlap.exact).toEqual(['React']);
    expect(overlap.related).toEqual([]);
    expect(overlap.missing).toEqual([]);
  });
});
