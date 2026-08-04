import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationRuleService } from '@/modules/auto-apply/controllers/application-rule.controller.js';

const API = '/api/v1/auto-apply/rules';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply application rules IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['PUT', API],
    ['POST', `${API}/pause`],
    ['POST', `${API}/resume`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'put' | 'post'](path)
      .set('x-user-id', 'spoofed-user');
    const res = method === 'PUT' ? await req.send({}) : await req;
    expect(res.status).toBe(401);
  });

  it('rejects dailyApplicationLimit above the allowed range', async () => {
    const user = await seedVerifiedUser({ email: 'rules-invalid@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(applicationRuleService, 'upsertRule');

    const res = await request(app)
      .put(API)
      .set(authHeader(token))
      .send({ dailyApplicationLimit: 10000 });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('scopes pause to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'rules-pause@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(applicationRuleService, 'pauseAutopilot').mockResolvedValue({
      id: 'rule-1',
      userId: String(user.id),
      minMatchScore: 0.85,
      dailyApplicationLimit: 5,
      weeklyApplicationLimit: null,
      blacklistedCompanySlugs: [],
      excludedTitleKeywords: [],
      excludedSources: [],
      autopilotEnabled: false,
      autopilotPausedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post(`${API}/pause`)
      .set(authHeader(token))
      .set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id));
  });
});
