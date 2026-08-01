import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  accessTokenForAdmin,
  accessTokenForUser,
  authHeader,
  seedAdmin,
  seedVerifiedUser,
} from '@/test-utils/fixtures.js';
import {
  RECOMMENDATIONS_PERMISSIONS,
  ROLE_PERMISSION_MAP,
} from '@/shared/rbac/permission.catalog.js';

const API = '/api/v1/job-recommendations';
const recommendationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const jobId = '11111111-1111-1111-1111-111111111111';

beforeEach(async () => {
  await resetTestState();
});

describe('job recommendation HTTP gates', () => {
  it('rejects anonymous list/detail/feedback/similar/status requests', async () => {
    const [list, detail, feedback, similar, status] = await Promise.all([
      request(app).get(API),
      request(app).get(`${API}/${recommendationId}`),
      request(app).post(`${API}/${recommendationId}/feedback`).send({ action: 'SAVED' }),
      request(app).get(`${API}/similar/${jobId}`),
      request(app).get(`${API}/status`),
    ]);

    expect(list.status).toBe(401);
    expect(detail.status).toBe(401);
    expect(feedback.status).toBe(401);
    expect(similar.status).toBe(401);
    expect(status.status).toBe(401);
  });

  it('rejects an ADMIN principal on user-owned recommendation routes', async () => {
    const admin = await seedAdmin({ email: 'recs-admin@example.com' });
    const token = accessTokenForAdmin(admin);

    const response = await request(app).get(API).set(authHeader(token));

    expect(response.status).toBe(403);
  });

  it('rejects a USER missing recommendations.read.own', async () => {
    const user = await seedVerifiedUser({ email: 'recs-no-read@example.com' });
    const token = accessTokenForUser(user);
    fakeDb.setRolePermissions(
      'USER',
      ROLE_PERMISSION_MAP.USER.filter((key) => key !== RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    );

    const response = await request(app).get(API).set(authHeader(token));

    expect(response.status).toBe(403);
  });

  it('returns an empty recommendation list for an authorized user', async () => {
    const user = await seedVerifiedUser({ email: 'recs-list@example.com' });
    const token = accessTokenForUser(user);

    const response = await request(app).get(API).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toMatchObject({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it('returns 404 for a missing recommendation detail', async () => {
    const user = await seedVerifiedUser({ email: 'recs-detail@example.com' });
    const token = accessTokenForUser(user);

    const response = await request(app).get(`${API}/${recommendationId}`).set(authHeader(token));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('RECOMMENDATION_NOT_FOUND');
  });

  it('returns readiness status for the authenticated user', async () => {
    const user = await seedVerifiedUser({ email: 'recs-status@example.com' });
    const token = accessTokenForUser(user);

    const response = await request(app).get(`${API}/status`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      canGenerateFromProfile: expect.any(Boolean),
      blockers: expect.any(Array),
      retrieval: expect.objectContaining({ configured: true }),
    });
  });
});
