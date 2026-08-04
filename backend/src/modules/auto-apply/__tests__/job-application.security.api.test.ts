import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { jobApplicationService } from '@/modules/auto-apply/controllers/job-application.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/submissions';
const APP_ID = '00000000-0000-4000-8000-000000000099';
const JOB_ID = '00000000-0000-4000-8000-000000000055';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply job application submissions IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['POST', API],
    ['GET', `${API}/${APP_ID}`],
    ['POST', `${API}/${APP_ID}/evaluate-eligibility`],
    ['POST', `${API}/${APP_ID}/status-transitions`],
    ['POST', `${API}/${APP_ID}/withdraw`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'post'](path)
      .set('x-user-id', 'spoofed-user');
    const res =
      method === 'POST' && path === API
        ? await req.send({ jobId: JOB_ID })
        : method === 'POST' && path.endsWith('/status-transitions')
          ? await req.send({ toStatus: 'MATCHED' })
          : await req;
    expect(res.status).toBe(401);
  });

  it('scopes create to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'submissions-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(jobApplicationService, 'initiate').mockResolvedValue({
      application: {
        id: APP_ID,
        userId: String(user.id),
        jobId: JOB_ID,
        normalisedJobUrl: null,
        canonicalJobId: 'canonical-hash-1',
        companySlug: 'acme',
        jobTitle: 'Backend Engineer',
        channel: 'UNSUPPORTED',
        status: 'DISCOVERED',
        approvalMode: 'PER_APPLICATION',
        matchScore: null,
        eligibilityResult: null,
        resumeVersionId: null,
        coverLetterContent: null,
        consentId: null,
        approvedAt: null,
        queuedAt: null,
        submittedAt: null,
        externalApplicationId: null,
        externalConfirmationUrl: null,
        failureCode: null,
        failureMessage: null,
        planInputsHash: null,
        planVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      possibleDuplicates: [],
    });

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .set('x-user-id', 'other-user')
      .send({ jobId: JOB_ID });

    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledWith(String(user.id), JOB_ID);
  });

  it('cross-user GET :id surfaces not found (no IDOR leak)', async () => {
    const user = await seedVerifiedUser({ email: 'submissions-attacker@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(jobApplicationService, 'getApplication').mockRejectedValue(
      new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND'),
    );

    const res = await request(app)
      .get(`${API}/${APP_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'victim-user');

    expect(res.status).toBe(404);
    expect(jobApplicationService.getApplication).toHaveBeenCalledWith(String(user.id), APP_ID);
  });

  it('rejects an invalid toStatus value with 400 before reaching the service', async () => {
    const user = await seedVerifiedUser({ email: 'submissions-badstatus@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(jobApplicationService, 'transitionStatus');

    const res = await request(app)
      .post(`${API}/${APP_ID}/status-transitions`)
      .set(authHeader(token))
      .send({ toStatus: 'HACKED' });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces an invalid state transition as 409 from the service', async () => {
    const user = await seedVerifiedUser({ email: 'submissions-conflict@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(jobApplicationService, 'transitionStatus').mockRejectedValue(
      new AppError(
        'Cannot transition submission from DISCOVERED to SUBMITTED',
        409,
        'INVALID_STATUS_TRANSITION',
      ),
    );

    const res = await request(app)
      .post(`${API}/${APP_ID}/status-transitions`)
      .set(authHeader(token))
      .send({ toStatus: 'SUBMITTED' });

    expect(res.status).toBe(409);
  });
});
