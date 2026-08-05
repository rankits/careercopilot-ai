import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationPlannerService } from '@/modules/auto-apply/controllers/planner.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/plan';
const JOB_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const samplePlan = {
  application: { id: 'jobapp-1', userId: 'user-1', status: 'READY_FOR_REVIEW' },
  decision: 'READY_FOR_REVIEW' as const,
  channel: 'EXTERNAL_MANUAL' as const,
  eligibility: { eligible: true, checks: [] },
  selectedResumeVersion: null,
  unresolvedQuestions: [],
  contentGenerationAvailable: false,
  coverLetter: null,
  screeningAnswers: [],
  contentWarnings: [],
};

describe('auto-apply planner IDOR / authz', () => {
  it.each([
    ['POST', API],
    ['GET', `${API}/${JOB_ID}`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'post' | 'get'](path)
      .set('x-user-id', 'spoofed-user');
    const res = method === 'POST' ? await req.send({ jobId: JOB_ID }) : await req;
    expect(res.status).toBe(401);
  });

  it('rejects a non-uuid jobId with 400 on create', async () => {
    const user = await seedVerifiedUser({ email: 'planner-badid@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(applicationPlannerService, 'createPlan');

    const res = await request(app).post(API).set(authHeader(token)).send({ jobId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('scopes plan creation to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'planner-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi
      .spyOn(applicationPlannerService, 'createPlan')
      .mockResolvedValue(samplePlan as never);

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .set('x-user-id', 'other-user')
      .send({ jobId: JOB_ID });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), JOB_ID);
  });

  it('surfaces a 404 when no plan exists yet for GET', async () => {
    const user = await seedVerifiedUser({ email: 'planner-noplan@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationPlannerService, 'getPlan').mockResolvedValue(null);

    const res = await request(app).get(`${API}/${JOB_ID}`).set(authHeader(token));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PLAN_NOT_FOUND');
  });

  it('surfaces a withdrawn-submission conflict as 409', async () => {
    const user = await seedVerifiedUser({ email: 'planner-withdrawn@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationPlannerService, 'createPlan').mockRejectedValue(
      new AppError(
        'This submission was withdrawn — start a new one to plan again.',
        409,
        'APPLICATION_WITHDRAWN',
      ),
    );

    const res = await request(app).post(API).set(authHeader(token)).send({ jobId: JOB_ID });

    expect(res.status).toBe(409);
  });
});
