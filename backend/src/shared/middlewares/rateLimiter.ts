import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { cacheService } from '@/infrastructure/cache/index.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { securityConfig } from '@/shared/config/security.conf.js';

interface RateLimiterOptions {
  windowMinutes: number;
  max: number;
  /** Namespaces the cache key so different limiters don't share buckets. */
  prefix: string;
  keyGenerator?: (req: Request) => string;
}

const defaultKeyGenerator = (req: Request): string => req.ip ?? 'unknown';

/**
 * Keys by client IP + the email in the request body, when present, so a
 * brute-force attempt against one account doesn't also throttle everyone
 * else sharing that IP (e.g. an office NAT).
 */
const emailAwareKeyGenerator = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  const emailKey = typeof email === 'string' && email.length > 0 ? email.toLowerCase() : 'unknown';
  return `${req.ip ?? 'unknown'}:${emailKey}`;
};

/**
 * Fixed-window rate limiter built on top of `infrastructure/cache`'s
 * atomic `increment`, so it works identically whether `CACHE_DRIVER` is
 * `memory` (single process, dev) or `redis` (shared across processes,
 * production).
 */
const buildLimiter = (options: RateLimiterOptions): RequestHandler => {
  const windowSeconds = options.windowMinutes * 60;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const cacheKey = `careercopilot:ratelimit:${options.prefix}:${keyGenerator(req)}`;

    cacheService
      .increment(cacheKey, windowSeconds)
      .then((count) => {
        if (count > options.max) {
          next(new AppError('Too many requests, please try again later', 429, 'TOO_MANY_REQUESTS'));
          return;
        }
        next();
      })
      .catch(next);
  };
};

/** General API-wide guardrail. */
export const globalRateLimiter = buildLimiter({
  windowMinutes: securityConfig.rateLimit.global.windowMinutes,
  max: securityConfig.rateLimit.global.max,
  prefix: 'global',
});

/** Applied to login / password endpoints. */
export const authRateLimiter = buildLimiter({
  windowMinutes: securityConfig.rateLimit.auth.windowMinutes,
  max: securityConfig.rateLimit.auth.max,
  prefix: 'auth',
  keyGenerator: emailAwareKeyGenerator,
});

/** Stricter limiter for OTP send/resend endpoints (real cost: an email per call). */
export const otpRateLimiter = buildLimiter({
  windowMinutes: securityConfig.rateLimit.otp.windowMinutes,
  max: securityConfig.rateLimit.otp.max,
  prefix: 'otp',
  keyGenerator: emailAwareKeyGenerator,
});
