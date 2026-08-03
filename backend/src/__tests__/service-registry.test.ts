import { describe, expect, it } from 'vitest';
import { USER_PROFILE_SERVICE, userProfileService } from '@/modules/user/index.js';
import { serviceRegistry } from '@/service-registry.js';

describe('service registry composition', () => {
  it('registers the User-owned profile service', () => {
    expect(serviceRegistry.has(USER_PROFILE_SERVICE)).toBe(true);
    expect(serviceRegistry.resolve(USER_PROFILE_SERVICE)).toBe(userProfileService);
  });
});
