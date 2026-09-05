import { describe, expect, it } from 'vitest';
import { RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS } from '@/modules/recommendations/constants/recommendation-feedback.constants.js';
import { isRetrievalExclusionFeedback } from '@/modules/recommendations/constants/recommendation-feedback.constants.js';

describe('recommendation feedback retrieval exclusion', () => {
  it('defines exclusion actions per JR-PROD-003', () => {
    expect(RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS).toEqual([
      'DISMISSED',
      'NOT_RELEVANT',
      'LESS_LIKE_THIS',
      'APPLIED',
    ]);
    expect(isRetrievalExclusionFeedback('SAVED')).toBe(false);
    expect(isRetrievalExclusionFeedback('DISMISSED')).toBe(true);
  });
});
