import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  accessTokenForAdmin,
  accessTokenForUser,
  authHeader,
  seedAdmin,
  seedVerifiedUser,
} from '@/test-utils/fixtures.js';
import { adminDiagnosticsService } from '@/modules/auto-apply/controllers/admin-diagnostics.controller.js';

const API = '/api/v1/auto-apply/admin/stuck-submissions';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply admin diagnostics IDOR / authz', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a regular USER principal — this is admin-only, cross-user data', async () => {
    const user = await seedVerifiedUser({ email: 'diagnostics-nonadmin@example.com' });
    const token = accessTokenForUser(user);

    const res = await request(app).get(API).set(authHeader(token));

    expect(res.status).toBe(403);
  });

  it('allows an ADMIN principal and returns the diagnostics list', async () => {
    const admin = await seedAdmin({ email: 'diagnostics-admin@example.com' });
    const token = accessTokenForAdmin(admin);

    const spy = vi.spyOn(adminDiagnosticsService, 'getStuckSubmissions').mockResolvedValue([]);

    const res = await request(app).get(API).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
  });

  it('rejects a non-numeric threshold query param with 400', async () => {
    const admin = await seedAdmin({ email: 'diagnostics-badquery@example.com' });
    const token = accessTokenForAdmin(admin);
    const spy = vi.spyOn(adminDiagnosticsService, 'getStuckSubmissions');

    const res = await request(app)
      .get(`${API}?queueStalledAfterMinutes=not-a-number`)
      .set(authHeader(token));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
