import { describe, expect, it, vi } from 'vitest';

import {
  hasNoRecommendationResults,
  notifyEmptyRecommendations,
} from './notifyEmptyRecommendations';

describe('notifyEmptyRecommendations', () => {
  it('shows an info toast with the provided message', () => {
    const showToast = vi.fn();
    notifyEmptyRecommendations(showToast, 'No matching jobs found for your profile.');

    expect(showToast).toHaveBeenCalledWith({
      severity: 'info',
      message: 'No matching jobs found for your profile.',
    });
  });
});

describe('hasNoRecommendationResults', () => {
  it('detects empty arrays and run payloads', () => {
    expect(hasNoRecommendationResults([])).toBe(true);
    expect(hasNoRecommendationResults([{ id: 'r1' }])).toBe(false);
    expect(hasNoRecommendationResults({ items: [], total: 0 })).toBe(true);
    expect(hasNoRecommendationResults({ items: [{ id: 'r1' }], total: 1 })).toBe(false);
  });
});
