import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  child: vi.fn(),
}));
vi.mock('@/shared/logger/logger.js', () => ({ logger: loggerMock }));

import { errorHandler } from '@/shared/middlewares/errorHandler.js';

const originalEnv = { ...process.env };

const req = { id: 'req-1', originalUrl: '/routes/1', method: 'POST' } as Request;

interface ResResult {
  statusNo: number | undefined;
  body: unknown;
}

const run = (err: unknown): ResResult & { statusMock: ReturnType<typeof vi.fn> } => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  errorHandler(err, req, res, next);
  return { statusNo: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0], statusMock: status };
};

const asRecord = (result: { body: unknown }) => result.body as Record<string, unknown>;

describe('errorHandler', () => {
  beforeEach(() => {
    loggerMock.error.mockClear();
    loggerMock.warn.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('handles a ZodError as a validation error', () => {
    let zodErr: unknown;
    try {
      z.object({ name: z.string() }).parse({});
    } catch (e) {
      zodErr = e;
    }
    const result = run(zodErr);
    expect(result.statusNo).toBe(400);
    const body = asRecord(result);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.status).toBe('error');
    expect(Array.isArray(body.errors)).toBe(true);
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('handles an AppError with an explicit code and status', () => {
    const result = run(new AppError('Thing forbidden', 403, 'FORBIDDEN'));
    const body = asRecord(result);
    expect(result.statusNo).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('Thing forbidden');
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('falls back code to ERROR when an AppError has none', () => {
    const result = run(new AppError('boom', 400));
    expect(asRecord(result).code).toBe('ERROR');
  });

  it('includes AppError data in the payload', () => {
    const result = run(new AppError('boom', 409, 'CONFLICT', { reason: 'dup' }));
    expect(asRecord(result).data).toEqual({ reason: 'dup' });
  });

  it('logs AppErrors at or above 500 as errors', () => {
    run(new AppError('server failed', 500, 'X'));
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  describe('prisma known request errors', () => {
    const known = (code: string, meta?: unknown) =>
      new Prisma.PrismaClientKnownRequestError('db', {
        code,
        clientVersion: '5.0.0',
        meta,
      });

    it('maps P2002 with an array target to a 409 conflict', () => {
      const result = run(known('P2002', { target: ['email', 'phone'] }));
      expect(result.statusNo).toBe(409);
      const body = asRecord(result);
      expect(body.code).toBe('CONFLICT');
      expect(body.message).toContain('email, phone');
      expect(loggerMock.warn).toHaveBeenCalledTimes(1);
    });

    it('maps P2002 with a non-array target to a generic field message', () => {
      const result = run(known('P2002', { target: 'email' }));
      expect(asRecord(result).message).toContain('this field');
    });

    it('maps P2025 to 404 NOT_FOUND', () => {
      const result = run(known('P2025'));
      expect(result.statusNo).toBe(404);
      expect(asRecord(result).code).toBe('NOT_FOUND');
    });

    it('maps P2003 to a 409 constraint violation', () => {
      const result = run(known('P2003'));
      expect(result.statusNo).toBe(409);
      expect(asRecord(result).message).toContain('related record constraint');
    });

    it('falls back to 500 DATABASE_ERROR for unknown codes', () => {
      const result = run(known('P0001'));
      expect(result.statusNo).toBe(500);
      expect(asRecord(result).code).toBe('DATABASE_ERROR');
      expect(loggerMock.error).toHaveBeenCalledTimes(1);
    });
  });

  it('handles a PrismaClientValidationError as a database validation error', () => {
    const err = new Prisma.PrismaClientValidationError('invalid', { clientVersion: '5.0.0' });
    const result = run(err);
    expect(result.statusNo).toBe(400);
    expect(asRecord(result).code).toBe('DATABASE_VALIDATION_ERROR');
  });

  it('handles a malformed JSON body parse error', () => {
    const e = new SyntaxError('Unexpected token');
    (e as { type?: string }).type = 'entity.parse.failed';
    const result = run(e);
    expect(result.statusNo).toBe(400);
    expect(asRecord(result).code).toBe('INVALID_JSON');
  });

  it('treats a generic Error as dev message (non-production)', () => {
    const result = run(new Error('dev detail'));
    expect(result.statusNo).toBe(500);
    const body = asRecord(result);
    expect(body.message).toBe('dev detail');
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('handles a syntax error without parse context through the 500 default', () => {
    const result = run(() => {
      throw new SyntaxError('boom');
    });
  });
});

const as = (result: { body: unknown }) => result.body as Partial<Record<string, string>>;

describe('errorHandler — 500 default path (nothing thrown)', () => {
  process.exitCode;
  void it('never runs', () => true);
});

describe('errorHandler', () => {
  let expected: unknown = null;
  const safeBody = undefined;

  it('marks a generic SyntaxError without a type as a generic message', () => {
    const result = run(new SyntaxError('nope'));
    expect(result.statusNo).toBe(500);
  });
});
