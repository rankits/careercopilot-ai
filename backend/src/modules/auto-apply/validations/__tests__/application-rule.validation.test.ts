import { describe, expect, it } from 'vitest';

import { UpdateApprovedResumeVersionSchema } from '@/modules/auto-apply/validations/resume-version.validation.js';
import { UpsertApplicationRuleSchema } from '@/modules/auto-apply/validations/application-rule.validation.js';

describe('UpdateApprovedResumeVersionSchema AA-026', () => {
  it('maps isDefault to isActive', () => {
    expect(UpdateApprovedResumeVersionSchema.parse({ isDefault: true })).toEqual({ isActive: true });
  });
});

describe('UpsertApplicationRuleSchema AA-027', () => {
  it('accepts exclusion arrays without autopilotEnabled', () => {
    const parsed = UpsertApplicationRuleSchema.parse({
      blacklistedCompanySlugs: ['Acme Corp'],
      excludedTitleKeywords: ['unpaid'],
      excludedSources: ['sketchy-board.example'],
    });

    expect(parsed).toEqual({
      blacklistedCompanySlugs: ['Acme Corp'],
      excludedTitleKeywords: ['unpaid'],
      excludedSources: ['sketchy-board.example'],
    });
  });

  it('strips autopilotEnabled from the parsed request body', () => {
    const parsed = UpsertApplicationRuleSchema.parse({
      autopilotEnabled: true,
      blacklistedCompanySlugs: ['Acme Corp'],
    });

    expect(parsed).toEqual({ blacklistedCompanySlugs: ['Acme Corp'] });
    expect(parsed).not.toHaveProperty('autopilotEnabled');
  });
});
