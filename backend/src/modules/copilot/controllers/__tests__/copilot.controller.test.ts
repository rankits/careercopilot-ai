import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('@/modules/copilot/services/copilot.service.js', () => ({
  copilotService: { chat: vi.fn() },
}));

import { chatController } from '@/modules/copilot/controllers/copilot.controller.js';
import { copilotService } from '@/modules/copilot/services/copilot.service.js';

const chatMock = vi.mocked(copilotService.chat);

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
};

const makeReq = (overrides: Partial<Request> = {}) =>
  ({
    user: { principalId: 'user-1', principalType: 'USER' },
    body: { message: 'help', page: 'home' },
    ...overrides,
  }) as unknown as Request;

const validBody = { message: 'help me', page: 'dashboard' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chatController', () => {
  it('returns a 200 success response with the reply', async () => {
    chatMock.mockResolvedValue({ reply: 'Some advice' });

    const req = makeReq({ body: validBody });
    const res = makeRes();
    const next = vi.fn();

    await chatController(req, res, next);

    expect(chatMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ message: 'help me', page: 'dashboard' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(
      (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        message: 'Career Copilot reply generated',
        data: { reply: 'Some advice' },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the principal id is missing', async () => {
    const req = makeReq({
      user: { principalType: 'USER' } as never,
      body: validBody,
    });
    const res = makeRes();
    const next = vi.fn();

    await chatController(req, res, next);

    expect(chatMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next.mock.calls[0][0] as Error & { statusCode?: number }).message).toBe(
      'Authentication required',
    );
  });

  it('rejects when the principal type is not USER', async () => {
    const req = makeReq({
      user: { principalId: 'admin-1', principalType: 'ADMIN' } as never,
      body: validBody,
    });
    const res = makeRes();
    const next = vi.fn();

    await chatController(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next.mock.calls[0][0] as Error & { statusCode?: number }).statusCode).toBe(401);
  });

  it('forwards body validation errors via next', async () => {
    const req = makeReq({ body: { message: '   ' } });
    const res = makeRes();
    const next = vi.fn();

    await chatController(req, res, next);

    expect(chatMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('forwards service errors via next', async () => {
    chatMock.mockRejectedValue(new Error('provider down'));

    const req = makeReq({ body: validBody });
    const res = makeRes();

    const error = await new Promise<unknown>((resolve) => {
      chatController(req, res, vi.fn(resolve));
    });

    expect((error as Error).message).toBe('provider down');
  });
});
