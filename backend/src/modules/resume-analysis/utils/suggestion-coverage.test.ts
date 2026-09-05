import { describe, expect, it } from 'vitest';

import {
  buildJdCoverageExtras,
  suggestionCoversJdSkills,
} from '@/modules/resume-analysis/utils/suggestion-coverage';

describe('suggestion-coverage', () => {
  it('adds JD skills when missing from existing suggestions', () => {
    const extras = buildJdCoverageExtras({
      missingSkills: ['Java', 'Spring Boot'],
      currentSkillsLine: 'React',
      existing: [],
    });
    expect(extras.some((item) => item.category === 'skills')).toBe(true);
    expect(extras[0]?.suggestedText).toMatch(/Java/i);
  });

  it('skips skills when already covered', () => {
    expect(
      suggestionCoversJdSkills(
        [{ category: 'skills', suggestedText: 'React, Java, Spring Boot' }],
        ['Java'],
      ),
    ).toBe(true);
    const extras = buildJdCoverageExtras({
      missingSkills: ['Java'],
      existing: [{ category: 'skills', suggestedText: 'React, Java' }],
    });
    expect(extras.some((item) => item.category === 'skills')).toBe(false);
  });
});
