import jwt, { type SignOptions } from 'jsonwebtoken';
import { jwtConfig } from '@/shared/config/jwt.conf.js';

/**
 * Stateless JWT access-token helpers, deliberately kept out of any single
 * module: verification must be usable from `shared/middlewares/auth.middleware.ts`
 * regardless of which principal (Admin or User) issued the token. Refresh
 * tokens are NOT JWTs - they are opaque, DB-backed, revocable tokens; see
 * each module's `token.service.ts`.
 */
export type PrincipalType = 'ADMIN' | 'USER';

export interface AccessTokenPayload {
  /** The principal's `publicId` - never the internal sequential db id. */
  sub: string;
  principalType: PrincipalType;
  email: string;
  role: string;
  tokenVersion: number;
}

const accessTokenSignOptions: SignOptions = {
  expiresIn: jwtConfig.accessExpiresIn as SignOptions['expiresIn'],
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
  algorithm: jwtConfig.algorithm,
};

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, jwtConfig.accessSecret, accessTokenSignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, jwtConfig.accessSecret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithms: [jwtConfig.algorithm],
  }) as unknown as AccessTokenPayload;

/**
 * Parses simple duration strings ("15m", "7d", "900s", "1h") into seconds.
 * Shared by access-token TTL reporting and refresh-token expiry
 * calculation so both read the same env-driven format.
 */
export const parseDurationSeconds = (value: string, fallbackSeconds = 900): number => {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackSeconds;
  const [, amountStr, unit] = match;
  const amount = Number(amountStr);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit as string] ?? 1);
};

/** Returns the access-token TTL, in seconds, for API responses. */
export const getAccessTokenTtlSeconds = (): number =>
  parseDurationSeconds(jwtConfig.accessExpiresIn, 900);
