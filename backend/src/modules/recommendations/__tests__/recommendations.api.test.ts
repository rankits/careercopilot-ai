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
import {
  careerTargetService,
  recommendationsService,
  savedSearchService,
  similarJobsService,
} from '@/modules/recommendations/index.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { recommendationsSwagger } from '@/modules/recommendations/swagger/recommendations.swagger.js';

const API = '/api/v1/job-recommendations';
const recommendationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const runId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const jobId = '11111111-1111-1111-1111-111111111111';
const savedSearchId = '44444444-4444-4444-4444-444444444444';
const careerTargetId = '33333333-3333-3333-3333-333333333333';

const savedSearchResponse = {
  id: savedSearchId,
  userId: '1',
  name: 'Remote TypeScript roles',
  query: 'TypeScript platform engineer',
  filters: { locations: ['Remote'], workModes: ['REMOTE'] },
  context: { titles: ['Platform Engineer'] },
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:01.000Z'),
  deletedAt: null,
};
const careerTargetResponse = {
  id: careerTargetId,
  userId: '1',
  goalText: 'Move from manual testing into automation QA',
  structured: { targetRole: 'Automation QA Engineer' },
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:01.000Z'),
  archivedAt: null,
};

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('job recommendation HTTP gates', () => {
  it('rejects anonymous requests on every personalized recommendation route', async () => {
    const [
      create,
      fromText,
      refresh,
      list,
      runDetail,
      detail,
      feedback,
      similar,
      status,
      savedSearches,
      savedSearchGenerate,
      careerTargets,
    ] = await Promise.all([
      request(app).post(API).send({ sourceType: 'PROFILE' }),
      request(app).post(`${API}/from-text`).send({ targetText: 'Backend engineer' }),
      request(app).post(`${API}/refresh`).send({}),
      request(app).get(API),
      request(app).get(`${API}/runs/${runId}`),
      request(app).get(`${API}/${recommendationId}`),
      request(app).post(`${API}/${recommendationId}/feedback`).send({ action: 'SAVED' }),
      request(app).get(`${API}/similar/${jobId}`),
      request(app).get(`${API}/status`),
      request(app).get(`${API}/saved-searches`),
      request(app).post(`${API}/saved-searches/${savedSearchId}/generate`).send({}),
      request(app).get(`${API}/career-targets`),
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
    expect(savedSearches.status).toBe(401);
    expect(savedSearchGenerate.status).toBe(401);
    expect(careerTargets.status).toBe(401);
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

    const [profileGenerate, textGenerate, refreshGenerate, savedSearchCreate] = await Promise.all([
      request(app).post(API).set(authHeader(token)).send({ sourceType: 'PROFILE' }),
      request(app)
        .post(`${API}/from-text`)
        .set(authHeader(token))
        .send({ targetText: 'Backend engineer' }),
      request(app).post(`${API}/refresh`).set(authHeader(token)).send({}),
      request(app)
        .post(`${API}/saved-searches`)
        .set(authHeader(token))
        .send({ name: 'Remote TypeScript roles', filters: {} }),
    ]);

    expect(profileGenerate.status).toBe(403);
    expect(textGenerate.status).toBe(403);
    expect(refreshGenerate.status).toBe(403);
    expect(savedSearchCreate.status).toBe(403);
  });

  it('rejects a USER missing recommendations.update.own on mutation routes', async () => {
    const user = await seedVerifiedUser({ email: 'recs-no-update@example.com' });
    const token = accessTokenForUser(user);
    fakeDb.setRolePermissions(
      'USER',
      ROLE_PERMISSION_MAP.USER.filter((key) => key !== RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    );

    const feedback = await request(app)
      .post(`${API}/${recommendationId}/feedback`)
      .set(authHeader(token))
      .send({ action: 'SAVED' });
    const savedSearchUpdate = await request(app)
      .patch(`${API}/saved-searches/${savedSearchId}`)
      .set(authHeader(token))
      .send({ name: 'Updated search' });

    expect(feedback.status).toBe(403);
    expect(savedSearchUpdate.status).toBe(403);
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
    expect(listSpy).toHaveBeenCalledWith(
      String(user.id),
      { page: 1, limit: 20 },
      {
        latestOnly: false,
        runId: undefined,
      },
    );
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
    expect(listSpy).toHaveBeenCalledWith(
      String(user.id),
      { page: 1, limit: 20 },
      {
        latestOnly: true,
        runId: undefined,
      },
    );
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
    const createSpy = vi
      .spyOn(recommendationsService, 'createForSource')
      .mockRejectedValue(
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

  it('creates, lists, retrieves, and archives career targets for the user', async () => {
    const user = await seedVerifiedUser({ email: 'recs-career-target-crud@example.com' });
    const token = accessTokenForUser(user);
    const listSpy = vi.spyOn(careerTargetService, 'list').mockResolvedValue({
      items: [careerTargetResponse],
      page: 1,
      limit: 10,
      total: 1,
    });
    const createSpy = vi
      .spyOn(careerTargetService, 'create')
      .mockResolvedValue({ ...careerTargetResponse, userId: String(user.id) });
    const getSpy = vi
      .spyOn(careerTargetService, 'get')
      .mockResolvedValue({ ...careerTargetResponse, userId: String(user.id) });
    const archiveSpy = vi.spyOn(careerTargetService, 'archive').mockResolvedValue(undefined);

    const list = await request(app).get(`${API}/career-targets?limit=10`).set(authHeader(token));
    const create = await request(app)
      .post(`${API}/career-targets`)
      .set(authHeader(token))
      .send({
        goalText: '  Move from manual testing into automation QA  ',
        structured: { targetRole: 'Automation QA Engineer' },
      });
    const detail = await request(app)
      .get(`${API}/career-targets/${careerTargetId}`)
      .set(authHeader(token));
    const archived = await request(app)
      .delete(`${API}/career-targets/${careerTargetId}`)
      .set(authHeader(token));

    expect(list.status).toBe(200);
    expect(list.body.data).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({
      id: careerTargetId,
      goalText: 'Move from manual testing into automation QA',
    });
    expect(detail.status).toBe(200);
    expect(archived.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith(String(user.id), { page: 1, limit: 10 });
    expect(createSpy).toHaveBeenCalledWith(String(user.id), {
      goalText: 'Move from manual testing into automation QA',
      structured: { targetRole: 'Automation QA Engineer' },
    });
    expect(getSpy).toHaveBeenCalledWith(String(user.id), careerTargetId);
    expect(archiveSpy).toHaveBeenCalledWith(String(user.id), careerTargetId);
  });

  it('creates, lists, updates, deletes, and retrieves saved searches for the user', async () => {
    const user = await seedVerifiedUser({ email: 'recs-saved-search-crud@example.com' });
    const token = accessTokenForUser(user);
    const listSpy = vi.spyOn(savedSearchService, 'list').mockResolvedValue({
      items: [savedSearchResponse],
      page: 1,
      limit: 10,
      total: 1,
    });
    const createSpy = vi
      .spyOn(savedSearchService, 'create')
      .mockResolvedValue({ ...savedSearchResponse, userId: String(user.id) });
    const getSpy = vi
      .spyOn(savedSearchService, 'get')
      .mockResolvedValue({ ...savedSearchResponse, userId: String(user.id) });
    const updateSpy = vi
      .spyOn(savedSearchService, 'update')
      .mockResolvedValue({ ...savedSearchResponse, name: 'Updated search' });
    const deleteSpy = vi.spyOn(savedSearchService, 'delete').mockResolvedValue(undefined);

    const list = await request(app).get(`${API}/saved-searches?limit=10`).set(authHeader(token));
    const create = await request(app)
      .post(`${API}/saved-searches`)
      .set(authHeader(token))
      .send({
        name: 'Remote TypeScript roles',
        query: '  TypeScript platform engineer  ',
        filters: { locations: ['Remote'] },
        context: { titles: ['Platform Engineer'] },
      });
    const detail = await request(app)
      .get(`${API}/saved-searches/${savedSearchId}`)
      .set(authHeader(token));
    const update = await request(app)
      .patch(`${API}/saved-searches/${savedSearchId}`)
      .set(authHeader(token))
      .send({ name: 'Updated search' });
    const deleted = await request(app)
      .delete(`${API}/saved-searches/${savedSearchId}`)
      .set(authHeader(token));

    expect(list.status).toBe(200);
    expect(list.body.data).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({
      id: savedSearchId,
      name: 'Remote TypeScript roles',
      query: 'TypeScript platform engineer',
    });
    expect(detail.status).toBe(200);
    expect(update.status).toBe(200);
    expect(update.body.data.name).toBe('Updated search');
    expect(deleted.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith(String(user.id), { page: 1, limit: 10 });
    expect(createSpy).toHaveBeenCalledWith(String(user.id), {
      name: 'Remote TypeScript roles',
      query: 'TypeScript platform engineer',
      filters: { locations: ['Remote'] },
      context: { titles: ['Platform Engineer'] },
    });
    expect(getSpy).toHaveBeenCalledWith(String(user.id), savedSearchId);
    expect(updateSpy).toHaveBeenCalledWith(String(user.id), savedSearchId, {
      name: 'Updated search',
    });
    expect(deleteSpy).toHaveBeenCalledWith(String(user.id), savedSearchId);
  });

  it('returns 404 for missing or unowned saved searches', async () => {
    const user = await seedVerifiedUser({ email: 'recs-saved-search-idor@example.com' });
    const token = accessTokenForUser(user);
    const getSpy = vi
      .spyOn(savedSearchService, 'get')
      .mockRejectedValue(
        new RecommendationError(
          'Saved search was not found',
          404,
          RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
        ),
      );

    const response = await request(app)
      .get(`${API}/saved-searches/${savedSearchId}`)
      .set(authHeader(token));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe(RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND);
    expect(getSpy).toHaveBeenCalledWith(String(user.id), savedSearchId);
  });

  it('generates recommendations from an owned saved search route', async () => {
    const user = await seedVerifiedUser({ email: 'recs-saved-search-generate@example.com' });
    const token = accessTokenForUser(user);
    const createSpy = vi.spyOn(recommendationsService, 'createForSource').mockResolvedValue([]);

    const response = await request(app)
      .post(`${API}/saved-searches/${savedSearchId}/generate`)
      .set(authHeader(token))
      .send({ filters: { filterMode: 'FLEXIBLE' } });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(createSpy).toHaveBeenCalledWith(String(user.id), {
      sourceType: 'SAVED_SEARCH',
      sourceId: savedSearchId,
      filters: { filterMode: 'FLEXIBLE' },
    });
  });

  it('returns 404 for non-owned recommendation run details', async () => {
    const user = await seedVerifiedUser({ email: 'recs-run-idor@example.com' });
    const token = accessTokenForUser(user);
    const getRunSpy = vi
      .spyOn(recommendationsService, 'getRunDetailsForUser')
      .mockRejectedValue(
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

  it('documents saved-search CRUD and generate routes in swagger', () => {
    const collection = recommendationsSwagger[`${API}/saved-searches`];
    const detail = recommendationsSwagger[`${API}/saved-searches/{savedSearchId}`];
    const generate = recommendationsSwagger[`${API}/saved-searches/{savedSearchId}/generate`];

    expect(collection?.get).toMatchObject({ security: [{ BearerAuth: [] }] });
    expect(collection?.post).toMatchObject({ security: [{ BearerAuth: [] }] });
    expect(detail?.get).toBeDefined();
    expect(detail?.patch).toBeDefined();
    expect(detail?.delete).toBeDefined();
    expect(generate?.post).toBeDefined();
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
