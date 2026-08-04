import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationAnswerService } from '@/modules/auto-apply/controllers/application-answer.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/answers';
const ANSWER_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply application answers IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['POST', API],
    ['PATCH', `${API}/${ANSWER_ID}`],
    ['DELETE', `${API}/${ANSWER_ID}`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](path)
      .set('x-user-id', 'spoofed-user');
    const res =
      method === 'POST'
        ? await req.send({ questionKey: 'notice_period_days', answer: '30' })
        : method === 'PATCH'
          ? await req.send({ answer: 'X' })
          : await req;
    expect(res.status).toBe(401);
  });

  it('rejects a prohibited demographic question at the API boundary', async () => {
    const user = await seedVerifiedUser({ email: 'answers-sensitive@example.com' });
    const token = accessTokenForUser(user);

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .send({ questionKey: 'disability_status', answer: 'Prefer not to say' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SENSITIVE_ANSWER_PROHIBITED');
  });

  it('cross-user PATCH uses caller principal and surfaces not found (no IDOR leak)', async () => {
    const user = await seedVerifiedUser({ email: 'answers-attacker@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationAnswerService, 'updateAnswer').mockRejectedValue(
      new AppError('Verified answer not found', 404, 'ANSWER_NOT_FOUND'),
    );

    const res = await request(app)
      .patch(`${API}/${ANSWER_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'victim-user')
      .send({ answer: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(applicationAnswerService.updateAnswer).toHaveBeenCalledWith(
      String(user.id),
      ANSWER_ID,
      expect.objectContaining({ answer: 'Hijacked' }),
    );
  });

  it('owner can list their own answers', async () => {
    const user = await seedVerifiedUser({ email: 'answers-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(applicationAnswerService, 'listAnswers').mockResolvedValue([]);

    const res = await request(app).get(API).set(authHeader(token)).set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id));
  });
});
