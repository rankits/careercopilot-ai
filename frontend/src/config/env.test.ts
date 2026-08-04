import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    await expect(import('./env')).rejects.toThrow('VITE_API_BASE_URL is not configured');
  });

  it('uses the configured VITE_API_BASE_URL when provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/v1');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://example.com');

    const { env } = await import('./env');

    expect(env.apiBaseUrl).toBe('/api/v1');
    expect(env.appEnv).toBe('production');
    expect(env.publicAppUrl).toBe('https://example.com');
  });
});
