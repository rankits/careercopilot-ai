import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { eligibilityService } from '@/modules/auto-apply/controllers/eligibility.controller.js';

const API = '/api/v1/auto-apply/eligibility';
const JOB_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply eligibility IDOR / authz', () => {
  it('returns 401 without auth (x-user-id ignored)', async () => {
    const res = await request(app).get(`${API}/${JOB_ID}`).set('x-user-id', 'spoofed-user');
    expect(res.status).toBe(401);
  });

  it('rejects a non-uuid jobId with 400', async () => {
    const user = await seedVerifiedUser({ email: 'eligibility-badid@example.com' });
    const token = accessTokenForUser(user);

    const res = await request(app).get(`${API}/not-a-uuid`).set(authHeader(token));
    expect(res.status).toBe(400);
  });

  it('evaluates eligibility scoped to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'eligibility-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(eligibilityService, 'evaluateForJob').mockResolvedValue({
      eligible: true,
      checks: [],
    });

    const res = await request(app)
      .get(`${API}/${JOB_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), JOB_ID);
  });
});
