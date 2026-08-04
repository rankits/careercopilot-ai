import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { candidateApplicationProfileService } from '@/modules/auto-apply/controllers/candidate-profile.controller.js';

const API = '/api/v1/auto-apply/profile';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply candidate profile IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['PUT', API],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'put'](path)
      .set('x-user-id', 'spoofed-user');
    const res = method === 'PUT' ? await req.send({}) : await req;
    expect(res.status).toBe(401);
  });

  it('scopes GET to the caller principal, ignoring x-user-id', async () => {
    const user = await seedVerifiedUser({ email: 'auto-apply-profile-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(candidateApplicationProfileService, 'getProfile').mockResolvedValue(null);

    const res = await request(app).get(API).set(authHeader(token)).set('x-user-id', 'victim-user');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id));
    expect(spy).not.toHaveBeenCalledWith('victim-user');
  });

  it('scopes PUT (upsert) to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'auto-apply-profile-writer@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(candidateApplicationProfileService, 'upsertProfile').mockResolvedValue({
      id: 'profile-1',
      userId: String(user.id),
      preferences: { desiredRoles: [], preferredLocations: [], remotePreference: 'ANY' },
      links: {},
      verification: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .put(API)
      .set(authHeader(token))
      .set('x-user-id', 'victim-user')
      .send({ preferences: { remotePreference: 'REMOTE' } });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      String(user.id),
      expect.objectContaining({
        preferences: expect.objectContaining({ remotePreference: 'REMOTE' }),
      }),
    );
  });

  it('rejects an invalid remotePreference with 400', async () => {
    const user = await seedVerifiedUser({ email: 'auto-apply-profile-invalid@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(candidateApplicationProfileService, 'upsertProfile');

    const res = await request(app)
      .put(API)
      .set(authHeader(token))
      .send({ preferences: { remotePreference: 'FROM_HOME' } });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
