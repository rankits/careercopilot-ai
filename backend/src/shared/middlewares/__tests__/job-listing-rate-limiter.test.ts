import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { cacheService } from '@/infrastructure/cache/index.js';
import { jobListingRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

describe('jobListingRateLimiter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows requests under the threshold', async () => {
    vi.spyOn(cacheService, 'increment').mockResolvedValue(1);
    const next = vi.fn() as unknown as NextFunction;

    jobListingRateLimiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(next).toHaveBeenCalledWith();
  });

  it('returns 429 when the threshold is exceeded', async () => {
    vi.spyOn(cacheService, 'increment').mockResolvedValue(10_000);
    const next = vi.fn() as unknown as NextFunction;

    jobListingRateLimiter({ ip: '1.2.3.4' } as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('TOO_MANY_REQUESTS');
  });
});
