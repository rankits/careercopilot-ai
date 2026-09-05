import { describe, expect, it } from 'vitest';

import {
  classifyRequirementDomain,
  humanizeRequirementCode,
} from '@/modules/auto-apply/utils/requirement-domain.util.js';

describe('requirement-domain classifier', () => {
  it('classifies WORK_REGION as eligibility', () => {
    expect(classifyRequirementDomain({ code: 'WORK_REGION' })).toBe('CANDIDATE_ELIGIBILITY');
  });

  it('classifies work authorization and sponsorship as eligibility', () => {
    expect(classifyRequirementDomain({ code: 'WORK_AUTHORIZATION' })).toBe('CANDIDATE_ELIGIBILITY');
    expect(classifyRequirementDomain({ code: 'SPONSORSHIP' })).toBe('CANDIDATE_ELIGIBILITY');
  });

  it('classifies experience and skills as resume evidence', () => {
    expect(classifyRequirementDomain({ code: 'TOTAL_EXPERIENCE_YEARS' })).toBe('RESUME_EVIDENCE');
    expect(classifyRequirementDomain({ code: 'MOBILE_DESIGN_EXPERIENCE' })).toBe('RESUME_EVIDENCE');
    expect(classifyRequirementDomain({ code: 'PORTFOLIO' })).toBe('RESUME_EVIDENCE');
  });

  it('humanizes codes for user-facing titles', () => {
    expect(humanizeRequirementCode('TOTAL_EXPERIENCE_YEARS')).toBe('Total professional experience');
    expect(humanizeRequirementCode('WORK_REGION')).toBe('Work region');
  });

  it('does not silently treat unknown codes as resume evidence', () => {
    expect(classifyRequirementDomain({ code: 'SOME_NOVEL_CODE_XYZ' })).toBe('UNKNOWN');
  });
});
