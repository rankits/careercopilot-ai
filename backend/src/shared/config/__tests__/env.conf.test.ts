import { describe, expect, it } from 'vitest';
import { envSchema } from '@/shared/config/env.conf.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/careercopilot',
  JWT_ACCESS_SECRET: 'default_access_secret_for_development_change_in_production',
  JWT_REFRESH_SECRET: 'default_refresh_secret_for_development_change_in_production',
  NODE_ENV: 'development',
};

describe('envSchema job age policy validation', () => {
  it('rejects embedding max age greater than storage max age when both filters are enabled', () => {
    const parsed = envSchema.safeParse({
      ...baseEnv,
      JOB_STORAGE_AGE_FILTER_ENABLED: 'true',
      JOB_STORAGE_MAX_AGE_DAYS: '5',
      JOB_EMBEDDING_AGE_FILTER_ENABLED: 'true',
      JOB_EMBEDDING_MAX_AGE_DAYS: '90',
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(
      parsed.error.issues.some((issue) => issue.path.includes('JOB_EMBEDDING_MAX_AGE_DAYS')),
    ).toBe(true);
  });

  it('allows embedding max age greater than storage when a filter is disabled', () => {
    const parsed = envSchema.safeParse({
      ...baseEnv,
      JOB_STORAGE_AGE_FILTER_ENABLED: 'false',
      JOB_STORAGE_MAX_AGE_DAYS: '5',
      JOB_EMBEDDING_AGE_FILTER_ENABLED: 'true',
      JOB_EMBEDDING_MAX_AGE_DAYS: '90',
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults to 90 storage days and 5 embedding days', () => {
    const parsed = envSchema.safeParse(baseEnv);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.JOB_STORAGE_MAX_AGE_DAYS).toBe(90);
    expect(parsed.data.JOB_EMBEDDING_MAX_AGE_DAYS).toBe(5);
  });
});
