import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { recommendationsService, similarJobsService } from '@/modules/recommendations/index.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { recommendationsSwagger } from '@/modules/recommendations/swagger/recommendations.swagger.js';

const API = '/api/v1/job-recommendations';
const recommendationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const runId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const jobId = '11111111-1111-1111-1111-111111111111';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('job recommendation HTTP gates', () => {
  it('rejects anonymous requests on every personalized recommendation route', async () => {
    const [create, fromText, refresh, list, runDetail, detail, feedback, similar, status] =
      await Promise.all([
      request(app).post(API).send({ sourceType: 'PROFILE' }),
      request(app).post(`${API}/from-text`).send({ targetText: 'Backend engineer' }),
      request(app).post(`${API}/refresh`).send({}),
      request(app).get(API),
      request(app).get(`${API}/runs/${runId}`),
      request(app).get(`${API}/${recommendationId}`),
      request(app).post(`${API}/${recommendationId}/feedback`).send({ action: 'SAVED' }),
      request(app).get(`${API}/similar/${jobId}`),
      request(app).get(`${API}/status`),
    ]);

    expect(create.status).toBe(401);
    expect(fromText.status).toBe(401);
    expect(refresh.status).toBe(401);
    expect(list.status).toBe(401);
    expect(runDetail.status).toBe(401);
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

  it('rejects a USER missing recommendations.create.own on generate routes', async () => {
    const user = await seedVerifiedUser({ email: 'recs-no-create@example.com' });
    const token = accessTokenForUser(user);
    fakeDb.setRolePermissions(
      'USER',
      ROLE_PERMISSION_MAP.USER.filter((key) => key !== RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    );

    const [profileGenerate, textGenerate, refreshGenerate] = await Promise.all([
      request(app).post(API).set(authHeader(token)).send({ sourceType: 'PROFILE' }),
      request(app)
        .post(`${API}/from-text`)
        .set(authHeader(token))
        .send({ targetText: 'Backend engineer' }),
      request(app).post(`${API}/refresh`).set(authHeader(token)).send({}),
    ]);

    expect(profileGenerate.status).toBe(403);
    expect(textGenerate.status).toBe(403);
    expect(refreshGenerate.status).toBe(403);
  });

  it('rejects a USER missing recommendations.update.own on feedback routes', async () => {
    const user = await seedVerifiedUser({ email: 'recs-no-update@example.com' });
    const token = accessTokenForUser(user);
    fakeDb.setRolePermissions(
      'USER',
      ROLE_PERMISSION_MAP.USER.filter((key) => key !== RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    );

    const response = await request(app)
      .post(`${API}/${recommendationId}/feedback`)
      .set(authHeader(token))
      .send({ action: 'SAVED' });

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

  it('passes String(req.user.principalId) to recommendation services', async () => {
    const user = await seedVerifiedUser({ email: 'recs-principal@example.com' });
    const token = accessTokenForUser(user);
    const listSpy = vi.spyOn(recommendationsService, 'listForUser').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    const response = await request(app)
      .get(`${API}?userId=public-user-id&page=1&limit=20`)
      .set(authHeader(token))
      .set('x-user-id', 'public-user-id');

    expect(response.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith(String(user.id), { page: 1, limit: 20 }, {
      latestOnly: false,
      runId: undefined,
    });
    expect(listSpy).not.toHaveBeenCalledWith('public-user-id', expect.anything());
  });

  it('forwards latestOnly list semantics to the service', async () => {
    const user = await seedVerifiedUser({ email: 'recs-latest@example.com' });
    const token = accessTokenForUser(user);
    const listSpy = vi.spyOn(recommendationsService, 'listForUser').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    const response = await request(app).get(`${API}?latestOnly=true`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith(String(user.id), { page: 1, limit: 20 }, {
      latestOnly: true,
      runId: undefined,
    });
  });

  it('refreshes recommendations from PROFILE by default and returns run details', async () => {
    const user = await seedVerifiedUser({ email: 'recs-refresh@example.com' });
    const token = accessTokenForUser(user);
    const refreshSpy = vi.spyOn(recommendationsService, 'refreshForSource').mockResolvedValue({
      run: {
        id: runId,
        userId: String(user.id),
        sourceType: 'PROFILE',
        sourceId: null,
        status: 'COMPLETED',
        candidateCount: 1,
        failureCode: null,
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
        completedAt: new Date('2026-08-02T00:00:01.000Z'),
      },
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    const response = await request(app).post(`${API}/refresh`).set(authHeader(token)).send({});

    expect(response.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledWith(String(user.id), { sourceType: 'PROFILE' });
    expect(response.body.data.run).toMatchObject({
      id: runId,
      sourceType: 'PROFILE',
      status: 'COMPLETED',
      lifecycleState: 'READY',
    });
    expect(response.body.data.items).toEqual([]);
  });

  it('accepts CAREER_GOAL generation with an owned source id', async () => {
    const user = await seedVerifiedUser({ email: 'recs-career-goal@example.com' });
    const token = accessTokenForUser(user);
    const careerTargetId = '33333333-3333-3333-3333-333333333333';
    const createSpy = vi.spyOn(recommendationsService, 'createForSource').mockResolvedValue([]);

    const response = await request(app).post(API).set(authHeader(token)).send({
      sourceType: 'CAREER_GOAL',
      sourceId: careerTargetId,
    });

    expect(response.status).toBe(200);
    expect(createSpy).toHaveBeenCalledWith(String(user.id), {
      sourceType: 'CAREER_GOAL',
      sourceId: careerTargetId,
    });
    expect(response.body.data).toEqual([]);
  });

  it('returns 404 for missing or unowned CAREER_GOAL sources', async () => {
    const user = await seedVerifiedUser({ email: 'recs-career-goal-idor@example.com' });
    const token = accessTokenForUser(user);
    const careerTargetId = '33333333-3333-3333-3333-333333333333';
    const createSpy = vi.spyOn(recommendationsService, 'createForSource').mockRejectedValue(
      new RecommendationError(
        'Owned career target was not found',
        404,
        RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
      ),
    );

    const response = await request(app).post(API).set(authHeader(token)).send({
      sourceType: 'CAREER_GOAL',
      sourceId: careerTargetId,
    });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe(RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND);
    expect(createSpy).toHaveBeenCalledWith(String(user.id), {
      sourceType: 'CAREER_GOAL',
      sourceId: careerTargetId,
    });
  });

  it('returns 404 for non-owned recommendation run details', async () => {
    const user = await seedVerifiedUser({ email: 'recs-run-idor@example.com' });
    const token = accessTokenForUser(user);
    const getRunSpy = vi.spyOn(recommendationsService, 'getRunDetailsForUser').mockRejectedValue(
      new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      ),
    );

    const response = await request(app).get(`${API}/runs/${runId}`).set(authHeader(token));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe(RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND);
    expect(getRunSpy).toHaveBeenCalledWith(String(user.id), runId, { page: 1, limit: 20 });
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
      ready: expect.any(Boolean),
      lifecycleState: 'NOT_STARTED',
      canGenerateFromProfile: expect.any(Boolean),
      blockers: expect.any(Array),
      stale: expect.any(Boolean),
      lastGeneratedAt: null,
      retrieval: expect.objectContaining({
        backend: 'PGVECTOR',
        configured: true,
        embeddingCoverageRatio: expect.any(Number),
      }),
    });
  });

  it('documents readiness lifecycle status in swagger', () => {
    const operation = recommendationsSwagger[`${API}/status`]?.get as
      | {
          security?: unknown;
          responses?: Record<string, { content?: { 'application/json'?: { schema?: unknown } } }>;
        }
      | undefined;

    expect(operation?.security).toEqual([{ BearerAuth: [] }]);
    const schema = operation?.responses?.[200]?.content?.['application/json']?.schema as
      | { properties?: { data?: { required?: string[]; properties?: Record<string, unknown> } } }
      | undefined;
    expect(schema?.properties?.data?.required).toEqual(
      expect.arrayContaining([
        'ready',
        'lifecycleState',
        'canGenerateFromProfile',
        'blockers',
        'retrieval',
      ]),
    );
    expect(schema?.properties?.data?.properties?.lifecycleState).toMatchObject({
      enum: expect.arrayContaining(['READY', 'STALE', 'FAILED_PROVIDER']),
    });
  });

  it('documents CAREER_GOAL as a generate source in swagger', () => {
    const operation = recommendationsSwagger[API]?.post as
      | {
          requestBody?: {
            content?: {
              'application/json'?: {
                schema?: { properties?: { sourceType?: { enum?: string[] } } };
              };
            };
          };
        }
      | undefined;
    const sourceType =
      operation?.requestBody?.content?.['application/json']?.schema?.properties?.sourceType;

    expect(sourceType?.enum).toEqual(expect.arrayContaining(['CAREER_GOAL']));
  });

  it('returns similar jobs through the authenticated route without the source job', async () => {
    const user = await seedVerifiedUser({ email: 'recs-similar@example.com' });
    const token = accessTokenForUser(user);
    const similarSpy = vi.spyOn(similarJobsService, 'findSimilar').mockResolvedValue([
      {
        job: {
          id: '22222222-2222-2222-2222-222222222222',
          title: 'Platform Engineer',
          company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: null, maximum: null, currency: null },
          skills: ['TypeScript'],
          publishedAt: null,
          applyUrl: null,
        },
        scoreResult: {
          overallScore: 0.8,
          components: {
            requiredSkills: 0.8,
            title: 0.8,
            experience: 0.8,
            responsibilities: 0.8,
            preferredSkills: 0.8,
            location: 0.8,
            industry: 0.8,
            salary: 0.8,
            qualifications: 0.8,
          },
          matchedSkills: [],
          aliasSkills: [],
          relatedSkills: [],
          transferableSkills: [],
          missingSkills: [],
          reasons: [],
        },
        category: 'GOOD_MATCH',
        matchType: 'RELATED',
      },
    ]);

    const response = await request(app)
      .get(`${API}/similar/${jobId}?limit=5`)
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(similarSpy).toHaveBeenCalledWith(String(user.id), jobId, 5);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].job.id).not.toBe(jobId);
  });
});
