import { describe, expect, it } from 'vitest';

import { collectParsedSkills } from './collectParsedSkills';

describe('collectParsedSkills', () => {
  it('collects skills from core skills groups and string lists', () => {
    expect(
      collectParsedSkills({
        coreSkills: ['React', 'TypeScript'],
        tools: ['Docker'],
      }),
    ).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Docker']));
    expect(
      collectParsedSkills({
        coreSkills: ['React', 'TypeScript'],
        tools: ['Docker'],
      }),
    ).toHaveLength(3);
  });

  it('splits comma-separated skill strings', () => {
    expect(collectParsedSkills('React, Node.js, PostgreSQL')).toEqual([
      'React',
      'Node.js',
      'PostgreSQL',
    ]);
  });
});
