import { describe, expect, it } from 'vitest';

import type { AnalysisResult } from '@/services/resumeBuilder.service';

import { isLowJdMatch, shouldBlockAnalyzeContinue, getAnalyzeGateKind } from './analyzeGate';

const completed = (overrides: Partial<AnalysisResult> = {}): AnalysisResult =>
  ({
    id: 1,
    resumeId: 'r1',
    status: 'COMPLETED',
    atsScore: 40,
    skillMatch: 30,
    ...overrides,
  }) as AnalysisResult;

describe('analyzeGate', () => {
  it('warns on low match but does not hard-block Continue', () => {
    const analysis = completed({ atsScore: 20, skillMatch: 10 });
    expect(isLowJdMatch(analysis)).toBe(true);
    expect(shouldBlockAnalyzeContinue(analysis)).toBe(false);
    expect(getAnalyzeGateKind(analysis, true)).toBe('low_match');
  });

  it('still hard-blocks invalid target role/JD', () => {
    const analysis = completed({
      atsScore: 0,
      skillMatch: 0,
      invalidTarget: true,
      invalidTargetMessage: 'Oops! You added a wrong Target Role and Job Description.',
    });
    expect(shouldBlockAnalyzeContinue(analysis)).toBe(true);
    expect(getAnalyzeGateKind(analysis, true)).toBe('invalid_target');
  });

  it('allows continue when skill and ATS clear the warning thresholds', () => {
    const analysis = completed({ atsScore: 50, skillMatch: 40 });
    expect(isLowJdMatch(analysis)).toBe(false);
    expect(shouldBlockAnalyzeContinue(analysis)).toBe(false);
    expect(getAnalyzeGateKind(analysis, true)).toBeNull();
  });
});
