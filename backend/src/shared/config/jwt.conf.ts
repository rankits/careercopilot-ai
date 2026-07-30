import { env } from '@/shared/config/env.conf.js';

/**
 * JWT configuration.
 *
 * Access tokens are intentionally short-lived (default 15m) since they are
 * stateless and cannot be revoked without a `tokenVersion` round trip.
 * Refresh tokens are long-lived but persisted (hashed) and individually
 * revocable - see `shared/security/token-version.cache.ts` and each
 * module's session-issuing token service.
 */
export const jwtConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshSecret: env.JWT_REFRESH_SECRET,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
  algorithm: 'HS256' as const,
};
