import { describe, expect, it } from 'vitest';

import {
  buildDynamicCareerQuickPicks,
  extractCurrentRole,
  inferCareerProfileTrack,
} from './resolveCareerQuickPicks';

describe('buildDynamicCareerQuickPicks', () => {
  it('builds paths from the user current technical role', () => {
    const picks = buildDynamicCareerQuickPicks({
      designation: 'Software Engineer',
      skills: 'React, TypeScript, Node.js',
    });

    expect(picks[0]).toBe('Software Engineer → Senior Software Engineer');
    expect(picks).toContain('Software Engineer → Tech Lead');
    expect(picks.every((path) => path.startsWith('Software Engineer →'))).toBe(true);
  });

  it('builds paths from the user current non-technical role', () => {
    const picks = buildDynamicCareerQuickPicks({
      designation: 'Marketing Coordinator',
      skills: 'SEO, content strategy, campaign management',
    });

    expect(picks[0]).toBe('Marketing Coordinator → Marketing Manager');
    expect(picks.every((path) => path.startsWith('Marketing Coordinator →'))).toBe(true);
  });

  it('uses work experience when designation is missing', () => {
    expect(
      extractCurrentRole({
        workExperience: 'HR Coordinator — People Ops Inc',
      }),
    ).toBe('HR Coordinator');

    const picks = buildDynamicCareerQuickPicks({
      workExperience: 'HR Coordinator — People Ops Inc',
      skills: 'recruitment, onboarding',
    });

    expect(picks[0]).toBe('HR Coordinator → HR Generalist');
  });

  it('falls back to balanced defaults when the profile has no role signal', () => {
    const picks = buildDynamicCareerQuickPicks({});
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.some((path) => /marketing/i.test(path))).toBe(true);
    expect(inferCareerProfileTrack({})).toBe('unknown');
  });
});
