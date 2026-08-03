import { describe, expect, it } from 'vitest';
import {
  canonicalSkillOverlap,
  defaultSkillCanonicalizer,
  normalizeSkillKey,
} from '@/modules/recommendations/skills/skill-canonicalization.service.js';

describe('SkillCanonicalizationService', () => {
  it('normalizes punctuation and casing for skill keys', () => {
    expect(normalizeSkillKey(' Node.js ')).toBe('nodejs');
    expect(normalizeSkillKey('Node JS')).toBe('nodejs');
  });

  it('canonicalizes curated aliases to reviewed display names', () => {
    expect(defaultSkillCanonicalizer.canonicalize('NodeJS')).toMatchObject({
      canonical: 'Node.js',
      normalized: 'nodejs',
      isAlias: true,
    });
    expect(defaultSkillCanonicalizer.canonicalize('Postgres')).toMatchObject({
      canonical: 'PostgreSQL',
      normalized: 'postgresql',
      isAlias: true,
    });
  });

  it('counts aliases as exact overlap and reports canonical labels', () => {
    const overlap = canonicalSkillOverlap(['Node.js', 'Redis'], ['NodeJS', 'Postgres']);

    expect(overlap).toEqual({
      ratio: 0.5,
      matched: ['Node.js'],
      missing: ['Redis'],
    });
  });
});
