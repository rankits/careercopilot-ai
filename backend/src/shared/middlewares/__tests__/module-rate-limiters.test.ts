import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { cacheService } from '@/infrastructure/cache/index.js';
import {
  applicationManagementRateLimiter,
  copilotRateLimiter,
  jobsIngestionRateLimiter,
  resumeAnalysisRateLimiter,
  resumeProcessingRateLimiter,
  userRateLimiter,
} from '@/shared/middlewares/rateLimiter.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const userLimiters = [
  ['applicationManagementRateLimiter', applicationManagementRateLimiter, 'application-management'],
  ['copilotRateLimiter', copilotRateLimiter, 'copilot'],
  ['resumeAnalysisRateLimiter', resumeAnalysisRateLimiter, 'resume-analysis'],
  ['resumeProcessingRateLimiter', resumeProcessingRateLimiter, 'resume-processing'],
  ['userRateLimiter', userRateLimiter, 'user'],
] as const;

const ipLimiters = [
  ['jobsIngestionRateLimiter', jobsIngestionRateLimiter, 'jobs-ingestion'],
] as const;

describe('module rate limiters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(userLimiters)('%s', (_name, limiter, prefix) => {
    it('keys authenticated USER requests by principal id, not IP', async () => {
      const increment = vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
      const next = vi.fn() as unknown as NextFunction;

      limiter(
        {
          ip: '1.2.3.4',
          user: { principalId: 42, principalType: 'USER', email: 'u@example.com', tokenVersion: 0 },
        } as Request,
        {} as Response,
        next,
      );
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(increment).toHaveBeenCalledWith(
        `careercopilot:ratelimit:${prefix}:42`,
        expect.any(Number),
      );
      expect(next).toHaveBeenCalledWith();
    });

    it('falls back to IP when there is no authenticated USER principal (e.g. an ADMIN caller)', async () => {
      const increment = vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
      const next = vi.fn() as unknown as NextFunction;

      limiter(
        {
          ip: '5.6.7.8',
          user: { principalId: 1, principalType: 'ADMIN', email: 'a@example.com', tokenVersion: 0 },
        } as Request,
        {} as Response,
        next,
      );
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(increment).toHaveBeenCalledWith(
        `careercopilot:ratelimit:${prefix}:5.6.7.8`,
        expect.any(Number),
      );
    });

    it('keeps each user in their own bucket', async () => {
      const increment = vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
      const next = vi.fn() as unknown as NextFunction;

      limiter(
        {
          ip: '1.2.3.4',
          user: {
            principalId: 'user-a',
            principalType: 'USER',
            email: 'a@example.com',
            tokenVersion: 0,
          },
        } as unknown as Request,
        {} as Response,
        next,
      );
      limiter(
        {
          ip: '1.2.3.4',
          user: {
            principalId: 'user-b',
            principalType: 'USER',
            email: 'b@example.com',
            tokenVersion: 0,
          },
        } as unknown as Request,
        {} as Response,
        next,
      );
      await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(2));

      expect(increment).toHaveBeenCalledWith(
        `careercopilot:ratelimit:${prefix}:user-a`,
        expect.any(Number),
      );
      expect(increment).toHaveBeenCalledWith(
        `careercopilot:ratelimit:${prefix}:user-b`,
        expect.any(Number),
      );
    });

    it('returns 429 once the count exceeds the configured max', async () => {
      vi.spyOn(cacheService, 'increment').mockResolvedValue(10_000);
      const next = vi.fn() as unknown as NextFunction;

      limiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    });

    it('propagates cache failures to next() instead of throwing', async () => {
      const cacheError = new Error('cache unreachable');
      vi.spyOn(cacheService, 'increment').mockRejectedValue(cacheError);
      const next = vi.fn() as unknown as NextFunction;

      limiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next).toHaveBeenCalledWith(cacheError);
    });
  });

  describe.each(ipLimiters)('%s', (_name, limiter, prefix) => {
    it('keys unauthenticated requests by IP', async () => {
      const increment = vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
      const next = vi.fn() as unknown as NextFunction;

      limiter({ ip: '9.9.9.9' } as Request, {} as Response, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(increment).toHaveBeenCalledWith(
        `careercopilot:ratelimit:${prefix}:9.9.9.9`,
        expect.any(Number),
      );
      expect(next).toHaveBeenCalledWith();
    });

    it('returns 429 once the count exceeds the configured max', async () => {
      vi.spyOn(cacheService, 'increment').mockResolvedValue(10_000);
      const next = vi.fn() as unknown as NextFunction;

      limiter({ ip: '9.9.9.9' } as Request, {} as Response, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  it('gives every module limiter its own cache-key prefix so buckets never collide', async () => {
    const increment = vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
    const next = vi.fn() as unknown as NextFunction;
    const req = { ip: '1.1.1.1' } as Request;

    for (const [, limiter] of [...userLimiters, ...ipLimiters]) {
      limiter(req, {} as Response, next);
    }
    await vi.waitFor(() =>
      expect(next).toHaveBeenCalledTimes(userLimiters.length + ipLimiters.length),
    );

    const keysUsed = increment.mock.calls.map((call) => call[0]);
    expect(new Set(keysUsed).size).toBe(keysUsed.length);
  });

  it('allows the request through at exactly max, and blocks the very next one', async () => {
    const increment = vi.spyOn(cacheService, 'increment');
    const next = vi.fn() as unknown as NextFunction;

    // The module's constant sets max: 60 - the boundary itself is what
    // buildLimiter's `count > options.max` check must get right.
    increment.mockResolvedValueOnce(60);
    applicationManagementRateLimiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    expect(next).toHaveBeenNthCalledWith(1);

    increment.mockResolvedValueOnce(61);
    applicationManagementRateLimiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(2));
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(429);
  });
});
