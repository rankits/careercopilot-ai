import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { endpointNotFound } from '@/shared/middlewares/endpointNotFound.js';

describe('endpointNotFound', () => {
  it('returns a 404 error envelope', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const next = vi.fn() as unknown as NextFunction;

    const req = { originalUrl: '/nope' } as Request;
    const res = { status } as unknown as Response;

    const result = endpointNotFound(req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Endpoint not found' }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(result).toBe(json.mock.results[0].value);
  });
});
