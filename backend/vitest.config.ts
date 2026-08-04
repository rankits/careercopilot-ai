import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    // Overrides applied before dotenv loads (dotenv never clobbers an
    // already-set process.env value), so the suite never depends on a real
    // Postgres/Redis/RabbitMQ being reachable - Prisma is mocked (see
    // src/test-utils/prisma-mock.ts) and the caching layer is forced to its
    // in-process memory driver regardless of the developer's local .env.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db?schema=public',
      CACHE_DRIVER: 'memory',
      JWT_ACCESS_SECRET: 'test_access_secret_at_least_16_chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_16_chars',
      // Fixed values for the security knobs specs assert exact behavior
      // against (e.g. "locks after N failed attempts"), independent of
      // whatever the developer's local .env happens to have.
      OTP_LENGTH: '6',
      PASSWORD_MIN_LENGTH: '8',
      ACCOUNT_LOCK_THRESHOLD: '5',
      ACCOUNT_LOCK_DURATION_MINUTES: '15',
      REFRESH_TOKEN_MAX_SESSIONS: '5',
      // Generous - HTTP rate limiting is not what these specs exercise;
      // account lockout (above) is the business rule under test.
      AUTH_RATE_LIMIT_MAX_REQUESTS: '1000',
      OTP_RATE_LIMIT_MAX_REQUESTS: '1000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      LOG_LEVEL: 'silent',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/auth/**', 'src/modules/user/**', 'src/modules/admin/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
