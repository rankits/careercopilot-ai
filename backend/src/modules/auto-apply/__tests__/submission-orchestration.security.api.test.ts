import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { submissionOrchestrationService } from '@/modules/auto-apply/controllers/submission-orchestration.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/submissions';
const APP_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleApplication = { id: APP_ID, userId: 'user-1', status: 'APPROVED' };

describe('auto-apply submission orchestration IDOR / authz', () => {
  it.each([
    ['POST', `${API}/${APP_ID}/approve`],
    ['POST', `${API}/${APP_ID}/queue`],
    ['POST', `${API}/${APP_ID}/confirm`],
    ['POST', `${API}/${APP_ID}/retry`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const res = await request(app)
      [method.toLowerCase() as 'post'](path)
      .set('x-user-id', 'spoofed-user');
    expect(res.status).toBe(401);
  });

  it('scopes approve to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'orchestration-approve@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi
      .spyOn(submissionOrchestrationService, 'approve')
      .mockResolvedValue(sampleApplication as never);

    const res = await request(app)
      .post(`${API}/${APP_ID}/approve`)
      .set(authHeader(token))
      .set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), APP_ID);
  });

  it('surfaces CONSENT_REQUIRED as 403 from approve', async () => {
    const user = await seedVerifiedUser({ email: 'orchestration-noconsent@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(submissionOrchestrationService, 'approve').mockRejectedValue(
      new AppError(
        'Grant RESUME_USAGE consent before approving an application.',
        403,
        'CONSENT_REQUIRED',
      ),
    );

    const res = await request(app).post(`${API}/${APP_ID}/approve`).set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_REQUIRED');
  });

  it('scopes queue to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'orchestration-queue@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi
      .spyOn(submissionOrchestrationService, 'queueForSubmission')
      .mockResolvedValue({ ...sampleApplication, status: 'QUEUED' } as never);

    const res = await request(app)
      .post(`${API}/${APP_ID}/queue`)
      .set(authHeader(token))
      .set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), APP_ID);
  });

  it('surfaces RETRY_NOT_ALLOWED as 409 from retry', async () => {
    const user = await seedVerifiedUser({ email: 'orchestration-retry@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(submissionOrchestrationService, 'retry').mockRejectedValue(
      new AppError('This submission cannot be retried automatically.', 409, 'RETRY_NOT_ALLOWED'),
    );

    const res = await request(app).post(`${API}/${APP_ID}/retry`).set(authHeader(token));

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RETRY_NOT_ALLOWED');
  });

  it('scopes confirm to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'orchestration-confirm@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi
      .spyOn(submissionOrchestrationService, 'confirmCompleted')
      .mockResolvedValue({ ...sampleApplication, status: 'SUBMITTED' } as never);

    const res = await request(app).post(`${API}/${APP_ID}/confirm`).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), APP_ID);
  });
});
