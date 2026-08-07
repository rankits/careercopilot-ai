import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { approvedResumeVersionService } from '@/modules/auto-apply/controllers/resume-version.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/resume-versions';
const VERSION_ID = '00000000-0000-4000-8000-000000000099';
const RESUME_ID = '00000000-0000-4000-8000-000000000055';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply approved resume versions IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['POST', API],
    ['PATCH', `${API}/${VERSION_ID}`],
    ['DELETE', `${API}/${VERSION_ID}`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](path)
      .set('x-user-id', 'spoofed-user');
    const res =
      method === 'POST'
        ? await req.send({ resumeId: RESUME_ID, label: 'Backend', category: 'Backend' })
        : method === 'PATCH'
          ? await req.send({ label: 'X' })
          : await req;
    expect(res.status).toBe(401);
  });

  it("cross-user create surfaces resume-not-found rather than leaking another user's resume", async () => {
    const user = await seedVerifiedUser({ email: 'resume-versions-attacker@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(approvedResumeVersionService, 'createVersion').mockRejectedValue(
      new AppError('Resume not found', 404, 'RESUME_NOT_FOUND'),
    );

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .send({ resumeId: RESUME_ID, label: 'Backend', category: 'Backend' });

    expect(res.status).toBe(404);
    expect(approvedResumeVersionService.createVersion).toHaveBeenCalledWith(
      String(user.id),
      expect.objectContaining({ resumeId: RESUME_ID }),
    );
  });

  it('owner can list their own approved resume versions', async () => {
    const user = await seedVerifiedUser({ email: 'resume-versions-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(approvedResumeVersionService, 'listVersions').mockResolvedValue([]);

    const res = await request(app).get(API).set(authHeader(token)).set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id));
  });
});
