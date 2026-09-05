import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { errorResponse, successResponse } from '@/shared/utils/response.js';

const req = {} as Request;
const res = {} as Response;

describe('catchAsync', () => {
  it('forwards the resolved promise and does not call next on success', async () => {
    const next = vi.fn() as unknown as NextFunction;
    const handler = vi.fn(async () => 'value');
    const wrapped = catchAsync(handler);
    wrapped(req, res, next);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejection to next()', async () => {
    const next = vi.fn() as unknown as NextFunction;
    const handler = vi.fn(async () => {
      throw new Error('boom');
    });
    catchAsync(handler)(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((next.mock.calls[0][0] as Error).message).toBe('boom');
  });
});

describe('successResponse', () => {
  it('returns a success envelope without data when omitted', () => {
    expect(successResponse('ok')).toEqual({ status: 'success', message: 'ok' });
  });

  it('includes data when provided', () => {
    expect(successResponse('ok', { a: 1 })).toEqual({
      status: 'success',
      message: 'ok',
      data: { a: 1 },
    });
  });
});

describe('errorResponse', () => {
  it('returns an error envelope with only message', () => {
    expect(errorResponse('failed')).toEqual({ status: 'error', message: 'failed' });
  });

  it('includes errors when provided', () => {
    expect(errorResponse('failed', [{ field: 'email', message: 'invalid' }])).toEqual({
      status: 'error',
      message: 'failed',
      errors: [{ field: 'email', message: 'invalid' }],
    });
  });

  it('includes code and requestId when provided in extra', () => {
    expect(errorResponse('failed', undefined, { code: 'X', requestId: 'r-1' })).toEqual({
      status: 'error',
      message: 'failed',
      code: 'X',
      requestId: 'r-1',
    });
  });

  it('omits code/requestId when not provided', () => {
    const out = errorResponse('failed', undefined, {});
    expect('code' in out).toBe(false);
    expect('requestId' in out).toBe(false);
  });
});
