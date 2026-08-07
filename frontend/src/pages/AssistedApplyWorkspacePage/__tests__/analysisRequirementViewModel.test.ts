import { describe, expect, it } from 'vitest';

import {
  averageRequirementConfidencePercent,
  extractorVersionLabel,
  formStatusLabel,
  mapRequirementToViewModel,
  providerDisplayLabel,
  submissionCapabilityLabel,
} from '../analysisRequirementViewModel';

describe('analysisRequirementViewModel', () => {
  it('maps WORK_REGION with review-required treatment', () => {
    const view = mapRequirementToViewModel({
      code: 'WORK_REGION',
      value: ['NORTH_AMERICA'],
      operator: 'IN',
      required: true,
      confidence: 0.95,
      reviewStatus: 'REVIEW_REQUIRED',
      sourceText: 'open to candidates based in North America',
      extractionMethod: 'DOM_RULE',
      assertion: 'REQUIRES',
      importance: 'REQUIRED',
      evidenceStrength: 'EXPLICIT_TEXT',
      geographic: {
        rawValue: 'North America',
        normalizedRegion: 'NORTH_AMERICA',
        interpretationStatus: 'REVIEW_REQUIRED',
      },
    });

    expect(view.title).toBe('Work Region');
    expect(view.operatorLabel).toBe('requires');
    expect(view.valueLabel).toBe('North America');
    expect(view.evidence).toContain('open to candidates based in North America');
    expect(view.requiredLabel).toBe('Required');
    expect(view.confidencePercent).toBe(95);
    expect(view.reviewLabel).toBe('Review required');
    expect(view.reviewTone).toBe('warning');
    expect(view.sourceLabel).toBe('Job description');
  });

  it('maps TOTAL_EXPERIENCE_YEARS and MOBILE_DESIGN_EXPERIENCE', () => {
    const experience = mapRequirementToViewModel({
      code: 'TOTAL_EXPERIENCE_YEARS',
      value: 5,
      operator: 'GTE',
      required: true,
      confidence: 0.98,
      sourceText: '5+ years experience',
      reviewStatus: 'AUTO_ACCEPTED',
      assertion: 'REQUIRES',
    });
    expect(experience.title).toBe('Total Experience Years');
    expect(experience.valueLabel).toBe('5+ years');
    expect(experience.confidencePercent).toBe(98);

    const mobile = mapRequirementToViewModel({
      code: 'MOBILE_DESIGN_EXPERIENCE',
      value: true,
      operator: 'REQUIRED',
      required: true,
      confidence: 0.95,
      sourceText: 'Mobile Product Design',
      reviewStatus: 'AUTO_ACCEPTED',
    });
    expect(mobile.title).toBe('Mobile Design Experience');
    expect(mobile.valueLabel).toBe('Required');
    expect(mobile.confidencePercent).toBe(95);
  });

  it('formats enums and average confidence', () => {
    expect(providerDisplayLabel('ASHBY')).toBe('Ashby');
    expect(formStatusLabel('NOT_INSPECTED')).toBe('Not inspected');
    expect(submissionCapabilityLabel('EXTERNAL_MANUAL')).toBe('External manual');
    expect(extractorVersionLabel('deterministic-v2')).toBe('Deterministic v2');
    expect(
      averageRequirementConfidencePercent([
        { code: 'A', confidence: 0.95 },
        { code: 'B', confidence: 0.98 },
        { code: 'C', confidence: 0.95 },
      ]),
    ).toBe(96);
    expect(averageRequirementConfidencePercent([])).toBeNull();
  });
});
