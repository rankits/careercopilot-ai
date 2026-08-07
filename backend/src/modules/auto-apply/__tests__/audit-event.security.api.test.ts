import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';

const API = '/api/v1/auto-apply/events';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply audit events IDOR / authz', () => {
  it('returns 401 without auth (x-user-id ignored)', async () => {
    const res = await request(app).get(API).set('x-user-id', 'spoofed-user');
    expect(res.status).toBe(401);
  });

  it('scopes the listing to the caller principal, ignoring x-user-id', async () => {
    const user = await seedVerifiedUser({ email: 'events-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(autoApplyEventService, 'listForUser').mockResolvedValue([]);

    const res = await request(app).get(API).set(authHeader(token)).set('x-user-id', 'other-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), undefined, undefined);
    expect(spy).not.toHaveBeenCalledWith('other-user');
  });

  it('combines jobApplicationId filter with caller userId (IDOR fail-closed)', async () => {
    const user = await seedVerifiedUser({ email: 'events-filter@example.com' });
    const token = accessTokenForUser(user);
    const foreignAppId = '00000000-0000-4000-8000-000000000099';

    const spy = vi.spyOn(autoApplyEventService, 'listForUser').mockResolvedValue([]);

    const res = await request(app)
      .get(API)
      .query({ jobApplicationId: foreignAppId })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(spy).toHaveBeenCalledWith(String(user.id), undefined, {
      jobApplicationId: foreignAppId,
    });
  });
});
