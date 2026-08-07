import { describe, expect, it } from 'vitest';
import { JobApplicationAdapterRegistry } from '@/modules/auto-apply/adapters/adapter-registry.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';

describe('JobApplicationAdapterRegistry', () => {
  it('resolves a registered adapter by channel', () => {
    const registry = new JobApplicationAdapterRegistry();
    registry.register(new ExternalRedirectAdapter());
    expect(registry.get('EXTERNAL_MANUAL')?.provider).toBe('external-redirect');
  });

  it('returns null (never fabricates a fallback) for an unregistered channel', () => {
    const registry = new JobApplicationAdapterRegistry();
    registry.register(new ExternalRedirectAdapter());
    expect(registry.get('EMAIL')).toBeNull();
    expect(registry.get('ATS_API')).toBeNull();
    expect(registry.get('BROWSER_ASSISTED')).toBeNull();
    expect(registry.get('UNSUPPORTED')).toBeNull();
  });
});
