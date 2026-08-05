import { describe, expect, it } from 'vitest';

import { resolveRemotePreferences } from '@/features/auto-apply/utils/setupCompleteness';

describe('resolveRemotePreferences AA-023', () => {
  it('hydrates legacy ANY into all work modes', () => {
    expect(
      resolveRemotePreferences({
        desiredRoles: [],
        preferredLocations: [],
        remotePreferences: [],
        remotePreference: 'ANY',
      }),
    ).toEqual(['REMOTE', 'HYBRID', 'ONSITE']);
  });
});
