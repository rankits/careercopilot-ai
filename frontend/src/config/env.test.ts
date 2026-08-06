import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from '@/config/env';

describe('resolveApiBaseUrl', () => {
  it('uses the Vite proxy path in dev when the configured API URL is absolute', () => {
    expect(
      resolveApiBaseUrl('https://l8tpbsvoh9.execute-api.ap-south-1.amazonaws.com/api/v1', true),
    ).toBe('/api/v1');
  });

  it('keeps relative API URLs unchanged in dev', () => {
    expect(resolveApiBaseUrl('/api/v1', true)).toBe('/api/v1');
  });

  it('uses the configured absolute URL in production builds', () => {
    expect(
      resolveApiBaseUrl('https://l8tpbsvoh9.execute-api.ap-south-1.amazonaws.com/api/v1', false),
    ).toBe('https://l8tpbsvoh9.execute-api.ap-south-1.amazonaws.com/api/v1');
  });
});
