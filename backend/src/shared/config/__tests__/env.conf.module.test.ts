import { afterEach, describe, expect, it, vi } from 'vitest';

// This file tests the module-level `safeParse(process.env)` + fail-fast path
// in env.conf.ts (lines ~200-218), which only runs at import time. We re-import
// the module under controlled process.env using vi.resetModules() so the
// top-level validation executes against the values we set.
describe('env.conf module evaluation', () => {
  const originalExit = process.exit;
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.exit = originalExit;
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  const resetProcessEnv = (overrides: Record<string, string | undefined>) => {
    process.env = { ...originalEnv, ...overrides };
  };

  it('exposes env, isProduction, isDevelopment and isTest exports for the test node', async () => {
    resetProcessEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db?schema=public',
      JWT_ACCESS_SECRET: 'default_access_secret_for_development_change_in_production',
      JWT_REFRESH_SECRET: 'default_refresh_secret_for_development_change_in_production',
    });
    vi.resetModules();
    const mod = await import('@/shared/config/env.conf.js');
    expect(mod.env.DATABASE_URL).toBe(
      'postgresql://test:test@localhost:5432/test_db?schema=public',
    );
    expect(mod.isProduction).toBe(false);
    expect(mod.isDevelopment).toBe(false);
    expect(mod.isTest).toBe(true);
    expect(mod.envSchema).toBeDefined();
  });

  it('exposes isProduction true when NODE_ENV is production', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      JWT_ACCESS_SECRET: 'a'.repeat(40),
      JWT_REFRESH_SECRET: 'b'.repeat(40),
    });
    vi.resetModules();
    const mod = await import('@/shared/config/env.conf.js');
    expect(mod.isProduction).toBe(true);
  });

  it('fails fast with a formatted error and exit code 1 when env is invalid', async () => {
    const exitMock = vi.fn() as unknown as typeof process.exit;
    process.exit = exitMock as typeof process.exit;

    // dotenv re-adds DATABASE_URL from .env on import (it never clobbers an
    // already-set value), so "missing" is not enough - an explicitly-empty
    // string is: it stays set, fails `z.string().min(1)` and trips the
    // fail-fast branch.
    const { DATABASE_URL: _dropped, ...rest } = originalEnv;
    process.env = { ...rest, NODE_ENV: 'test', DATABASE_URL: '' };
    vi.resetModules();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // `process.exit` is swapped for a no-op mock, so the module does not
    // actually terminate; instead its fail-fast branch writes the stderr
    // report, calls the (mocked) exit, then keeps evaluating and crashes on
    // `env.NODE_ENV` (parsed.data is undefined on failure) - so the import
    // rejects. Assert the stderr report + exit call it made along the way.
    await expect(import('@/shared/config/env.conf.js')).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const message = consoleErrorSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain('Invalid environment configuration');
    expect(exitMock).toHaveBeenCalledWith(1);
    consoleErrorSpy.mockRestore();
  });
});
