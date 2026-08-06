import { describe, expect, it } from 'vitest';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
import { skillAppearsIn } from '@/modules/resumes/utils/skill-normalizer.js';
import { GOLDEN_EVAL_FIXTURES } from '@/modules/resume-analysis/tests/eval/golden-fixtures.js';

/**
 * Deterministic ATS golden eval (no live LLM).
 * Guards against silent score inflation / collapse regressions.
 */
describe('resume analyzer golden eval set', () => {
  it('includes at least 8 fixtures', () => {
    expect(GOLDEN_EVAL_FIXTURES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(GOLDEN_EVAL_FIXTURES)('scores fixture $id within expected tolerance bands', (fixture) => {
    const scored = scoreEditedResume({
      content: fixture.resume,
      baselineAtsScore: 50,
      jobDescription: fixture.jobDescription,
      targetRole: fixture.targetRole,
      keywords: fixture.keywords,
      skillAnalysis: fixture.skillAnalysis,
      appliedSuggestions: [],
    });

    expect(
      scored.atsScore,
      `${fixture.id} atsScore=${scored.atsScore} outside [${fixture.expected.atsScoreMin}, ${fixture.expected.atsScoreMax}]`,
    ).toBeGreaterThanOrEqual(fixture.expected.atsScoreMin);
    expect(scored.atsScore).toBeLessThanOrEqual(fixture.expected.atsScoreMax);

    expect(
      scored.skillMatch,
      `${fixture.id} skillMatch=${scored.skillMatch} outside [${fixture.expected.skillMatchMin}, ${fixture.expected.skillMatchMax}]`,
    ).toBeGreaterThanOrEqual(fixture.expected.skillMatchMin);
    expect(scored.skillMatch).toBeLessThanOrEqual(fixture.expected.skillMatchMax);

    for (const skill of fixture.expected.matchedSkills) {
      expect(
        skillAppearsIn(fixture.resume, skill),
        `${fixture.id}: expected matched skill "${skill}" in resume`,
      ).toBe(true);
    }
    for (const skill of fixture.expected.missingSkills) {
      expect(
        skillAppearsIn(fixture.resume, skill),
        `${fixture.id}: expected missing skill "${skill}" absent from resume`,
      ).toBe(false);
    }
  });

  it('keeps cross-domain skill match strictly below strong-match fixture', () => {
    const strong = GOLDEN_EVAL_FIXTURES.find((f) => f.id === 'fe-strong-match')!;
    const cross = GOLDEN_EVAL_FIXTURES.find((f) => f.id === 'cross-domain-nurse-vs-fe')!;

    const strongScore = scoreEditedResume({
      content: strong.resume,
      baselineAtsScore: 50,
      jobDescription: strong.jobDescription,
      targetRole: strong.targetRole,
      keywords: strong.keywords,
      skillAnalysis: strong.skillAnalysis,
      appliedSuggestions: [],
    });
    const crossScore = scoreEditedResume({
      content: cross.resume,
      baselineAtsScore: 50,
      jobDescription: cross.jobDescription,
      targetRole: cross.targetRole,
      keywords: cross.keywords,
      skillAnalysis: cross.skillAnalysis,
      appliedSuggestions: [],
    });

    expect(crossScore.skillMatch).toBeLessThan(strongScore.skillMatch);
    expect(crossScore.atsScore).toBeLessThan(strongScore.atsScore);
  });
});
