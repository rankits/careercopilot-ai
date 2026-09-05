import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { getPostAuthRoute } from '@/features/auth/utils/getPostAuthRoute';

describe('getPostAuthRoute', () => {
  it('returns onboarding when the profile is incomplete', () => {
    expect(getPostAuthRoute(false)).toBe(ROUTES.PROFILE);
  });

  it('returns the job feed when the profile is complete', () => {
    expect(getPostAuthRoute(true)).toBe(ROUTES.JOB_FEED);
  });
});
