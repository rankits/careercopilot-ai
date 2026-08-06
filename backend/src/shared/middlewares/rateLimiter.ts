import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { cacheService } from '@/infrastructure/cache/index.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { securityConfig } from '@/shared/config/security.conf.js';
import { APPLICATION_MANAGEMENT_RATE_LIMIT } from '@/modules/application-management/constants/application-management.rate-limit.constant.js';
import { COPILOT_RATE_LIMIT } from '@/modules/copilot/constants/copilot.rate-limit.constant.js';
import { JOBS_INGESTION_RATE_LIMIT } from '@/modules/jobs/constants/jobs.rate-limit.constant.js';
import { RESUME_ANALYSIS_RATE_LIMIT } from '@/modules/resume-analysis/constants/resume-analysis.rate-limit.constant.js';
import { RESUME_PROCESSING_RATE_LIMIT } from '@/modules/resumes/constants/resumes.rate-limit.constant.js';
import { USER_RATE_LIMIT } from '@/modules/user/constants/user.rate-limit.constant.js';

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

/** Keys by authenticated USER principal id when present, otherwise client IP. */
const authenticatedUserKeyGenerator = (req: Request): string => {
  const userId =
    req.user?.principalType === 'USER' ? String(req.user.principalId).trim() : undefined;
  return userId && userId.length > 0 ? userId : (req.ip ?? 'unknown');
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

/** Tighter limiter for public job discovery (anti-scrape). */
export const jobListingRateLimiter = buildLimiter({
  windowMinutes: securityConfig.rateLimit.jobListing.windowMinutes,
  max: securityConfig.rateLimit.jobListing.max,
  prefix: 'job-listing',
});

/** Limits expensive sync recommendation generation (embedding + vector search). */
export const recommendationRateLimiter = buildLimiter({
  windowMinutes: securityConfig.rateLimit.recommendation.windowMinutes,
  max: securityConfig.rateLimit.recommendation.max,
  prefix: 'recommendation',
  keyGenerator: authenticatedUserKeyGenerator,
});

/** Authenticated CRUD on applications, notes & tasks. */
export const applicationManagementRateLimiter = buildLimiter({
  windowMinutes: APPLICATION_MANAGEMENT_RATE_LIMIT.windowMinutes,
  max: APPLICATION_MANAGEMENT_RATE_LIMIT.max,
  prefix: 'application-management',
  keyGenerator: authenticatedUserKeyGenerator,
});

/** Career Copilot chat - each call costs LLM tokens. */
export const copilotRateLimiter = buildLimiter({
  windowMinutes: COPILOT_RATE_LIMIT.windowMinutes,
  max: COPILOT_RATE_LIMIT.max,
  prefix: 'copilot',
  keyGenerator: authenticatedUserKeyGenerator,
});

/** Admin-triggered job ingestion - fans out to every external provider. */
export const jobsIngestionRateLimiter = buildLimiter({
  windowMinutes: JOBS_INGESTION_RATE_LIMIT.windowMinutes,
  max: JOBS_INGESTION_RATE_LIMIT.max,
  prefix: 'jobs-ingestion',
});

/** Guards the AI-cost resume-analysis endpoints (/analyze, /recheck). */
export const resumeAnalysisRateLimiter = buildLimiter({
  windowMinutes: RESUME_ANALYSIS_RATE_LIMIT.windowMinutes,
  max: RESUME_ANALYSIS_RATE_LIMIT.max,
  prefix: 'resume-analysis',
  keyGenerator: authenticatedUserKeyGenerator,
});

/** Resume upload/parse/reparse - file storage + AI extraction. */
export const resumeProcessingRateLimiter = buildLimiter({
  windowMinutes: RESUME_PROCESSING_RATE_LIMIT.windowMinutes,
  max: RESUME_PROCESSING_RATE_LIMIT.max,
  prefix: 'resume-processing',
  keyGenerator: authenticatedUserKeyGenerator,
});

/** Light safety net for user profile & directory-listing endpoints. */
export const userRateLimiter = buildLimiter({
  windowMinutes: USER_RATE_LIMIT.windowMinutes,
  max: USER_RATE_LIMIT.max,
  prefix: 'user',
  keyGenerator: authenticatedUserKeyGenerator,
});
