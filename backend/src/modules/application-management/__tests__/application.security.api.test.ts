import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationService } from '@/modules/application-management/controllers/application.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/applications';
const APP_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JOB-QA-002 application IDOR / authz regression', () => {
  it.each([
    ['GET', `${API}`],
    ['GET', `${API}/${APP_ID}`],
    ['PATCH', `${API}/${APP_ID}`],
    ['DELETE', `${API}/${APP_ID}`],
    ['POST', `${API}/${APP_ID}/archive`],
    ['POST', `${API}/saved-jobs`],
    ['DELETE', `${API}/saved-jobs/${APP_ID}`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'patch' | 'delete' | 'post'](path)
      .set('x-user-id', 'spoofed-user');
    const res =
      method === 'PATCH'
        ? await req.send({ jobTitle: 'X' })
        : method === 'POST' && path.endsWith('/saved-jobs')
          ? await req.send({ jobId: APP_ID })
          : await req;
    expect(res.status).toBe(401);
  });

  it('savePlatformJob uses caller principal and is idempotent', async () => {
    const user = await seedVerifiedUser({ email: 'saver@example.com' });
    const token = accessTokenForUser(user);
    const jobId = '00000000-0000-4000-8000-000000000055';

    const spy = vi.spyOn(applicationService, 'savePlatformJob').mockResolvedValue({
      created: false,
      application: {
        id: APP_ID,
        userId: String(user.id),
        jobId,
        jobTitle: 'Engineer',
        companyName: 'Acme',
      } as never,
    });

    const res = await request(app).post(`${API}/saved-jobs`).set(authHeader(token)).send({ jobId });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), jobId);
  });

  it('owner can read their application (happy path)', async () => {
    const user = await seedVerifiedUser({ email: 'owner-read@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationService, 'getApplicationById').mockResolvedValue({
      id: APP_ID,
      userId: String(user.id),
      jobTitle: 'Engineer',
      companyName: 'Acme',
    } as never);

    const res = await request(app).get(`${API}/${APP_ID}`).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(applicationService.getApplicationById).toHaveBeenCalledWith(String(user.id), APP_ID);
  });

  it('cross-user PATCH uses caller principal and surfaces not found', async () => {
    const user = await seedVerifiedUser({ email: 'attacker@patch.example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationService, 'updateApplication').mockRejectedValue(
      new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND'),
    );

    const res = await request(app)
      .patch(`${API}/${APP_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'victim-public-id')
      .send({ jobTitle: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(applicationService.updateApplication).toHaveBeenCalledWith(
      String(user.id),
      APP_ID,
      expect.objectContaining({ jobTitle: 'Hijacked' }),
    );
  });

  it('cross-user DELETE uses caller principal and surfaces not found', async () => {
    const user = await seedVerifiedUser({ email: 'attacker@delete.example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationService, 'deleteApplication').mockRejectedValue(
      new AppError('Application not found or access denied', 404, 'APPLICATION_NOT_FOUND'),
    );

    const res = await request(app)
      .delete(`${API}/${APP_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'victim-public-id');

    expect(res.status).toBe(404);
    expect(applicationService.deleteApplication).toHaveBeenCalledWith(String(user.id), APP_ID);
  });

  it('rejects invalid sortBy with 400 (no Prisma injection path)', async () => {
    const user = await seedVerifiedUser({ email: 'sort-abuse@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(applicationService, 'getApplications');

    const res = await request(app).get(`${API}?sortBy=passwordHash:asc`).set(authHeader(token));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
