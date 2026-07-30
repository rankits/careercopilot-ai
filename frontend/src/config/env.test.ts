import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the local backend API URL when no VITE_API_BASE_URL is provided', async () => {
    const { env } = await import('./env');

    expect(env.apiBaseUrl).toBe('http://localhost:5001/api/v1');
  });

  it('uses the configured VITE_API_BASE_URL when provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/v1');

    const { env } = await import('./env');

    expect(env.apiBaseUrl).toBe('/api/v1');
  });
});
