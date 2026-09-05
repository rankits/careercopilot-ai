import { describe, expect, it } from 'vitest';

import { buildImproveResumeHref, isSafeAssistedApplyReturnTo } from './returnToNavigation';

describe('buildImproveResumeHref', () => {
  it('includes assisted-apply source and jobApplicationId for Builder prefill', () => {
    const href = buildImproveResumeHref({
      resumeId: 'resume-1',
      jobApplicationId: '11111111-1111-4111-8111-111111111111',
    });
    const url = new URL(href, 'http://localhost');
    expect(url.searchParams.get('source')).toBe('assisted-apply');
    expect(url.searchParams.get('jobApplicationId')).toBe('11111111-1111-4111-8111-111111111111');
    expect(isSafeAssistedApplyReturnTo(url.searchParams.get('returnTo'))).toBe(true);
  });

  it('rejects open redirects', () => {
    expect(isSafeAssistedApplyReturnTo('https://evil.example/assisted-apply/x')).toBe(false);
    expect(isSafeAssistedApplyReturnTo('//evil.example')).toBe(false);
  });
});
