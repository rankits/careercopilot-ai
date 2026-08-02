import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recommendationsService } from './recommendations.service';

const { deleteMock, getMock, postMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: getMock,
    post: postMock,
    delete: deleteMock,
  },
}));

describe('recommendationsService', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
  });

  it('unwraps list envelope and pagination fields', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          items: [{ id: 'r1', job: { id: 'j1' }, scoreResult: { overallScore: 0.82 } }],
          page: 2,
          limit: 10,
          total: 21,
        },
      },
    });

    const result = await recommendationsService.list({
      page: 2,
      limit: 10,
      latestOnly: true,
    });
    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations',
      expect.objectContaining({
        params: { page: 2, limit: 10, latestOnly: true },
      }),
    );
    expect(result.total).toBe(21);
    expect(result.items).toHaveLength(1);
  });

  it('posts PROFILE generate without auto sourceId', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromProfile();
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations',
      { sourceType: 'PROFILE' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(items).toHaveLength(1);
  });

  it('posts RESUME generate with sourceId', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromResume('resume-1');
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations',
      { sourceType: 'RESUME', sourceId: 'resume-1' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(items).toHaveLength(1);
  });

  it('posts CAREER_GOAL generate with sourceId', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromCareerGoal('target-1');
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations',
      { sourceType: 'CAREER_GOAL', sourceId: 'target-1' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(items).toHaveLength(1);
  });

  it('posts saved-search generate to the rerun route', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromSavedSearch('search-1');
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations/saved-searches/search-1/generate',
      {},
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(items).toHaveLength(1);
  });

  it('posts target text generate to the from-text route', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromText('remote Node.js backend');
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations/from-text',
      { targetText: 'remote Node.js backend' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(items).toHaveLength(1);
  });

  it('posts PROFILE refresh and unwraps run details', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          run: {
            id: 'run-1',
            sourceType: 'PROFILE',
            sourceId: null,
            status: 'COMPLETED',
            lifecycleState: 'READY',
            candidateCount: 1,
            failureCode: null,
            createdAt: '2026-08-02T00:00:00.000Z',
            completedAt: '2026-08-02T00:00:01.000Z',
          },
          items: [{ id: 'r1', job: { id: 'j1' }, scoreResult: { overallScore: 0.82 } }],
          page: 1,
          limit: 20,
          total: 1,
        },
      },
    });

    const result = await recommendationsService.refreshFromProfile();
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations/refresh',
      { sourceType: 'PROFILE' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(result.run).toMatchObject({ id: 'run-1', lifecycleState: 'READY' });
    expect(result.items).toHaveLength(1);
  });

  it('loads run details with pagination', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          run: {
            id: 'run-1',
            sourceType: 'PROFILE',
            sourceId: null,
            status: 'COMPLETED',
            lifecycleState: 'READY',
            candidateCount: 1,
            failureCode: null,
            createdAt: '2026-08-02T00:00:00.000Z',
            completedAt: '2026-08-02T00:00:01.000Z',
          },
          items: [],
          page: 2,
          limit: 5,
          total: 8,
        },
      },
    });

    const result = await recommendationsService.getRunDetails('run-1', { page: 2, limit: 5 });
    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations/runs/run-1',
      expect.objectContaining({ params: { page: 2, limit: 5 } }),
    );
    expect(result.total).toBe(8);
    expect(result.run.id).toBe('run-1');
  });

  it('loads similar jobs with a bounded limit', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          {
            rank: 1,
            job: { id: 'job-2' },
            displayScore: 84,
            scoreResult: { overallScore: 0.84 },
            category: 'BEST_MATCH',
            matchType: 'RELATED',
          },
        ],
      },
    });

    const result = await recommendationsService.getSimilarJobs('job-1', { limit: 5 });
    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations/similar/job-1',
      expect.objectContaining({ params: { limit: 5 } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].displayScore).toBe(84);
  });

  it('creates a career target from goal text', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          id: 'target-1',
          goalText: 'Move into automation QA',
          structured: {},
          createdAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      },
    });

    const result = await recommendationsService.createCareerTarget('Move into automation QA');
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations/career-targets',
      { goalText: 'Move into automation QA' },
      expect.objectContaining({ signal: undefined }),
    );
    expect(result.id).toBe('target-1');
  });

  it('lists, creates, and deletes saved searches', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              id: 'search-1',
              name: 'Remote TypeScript',
              query: 'TypeScript',
              filters: {},
              context: {},
              createdAt: '2026-08-02T00:00:00.000Z',
              updatedAt: '2026-08-02T00:00:00.000Z',
            },
          ],
          page: 1,
          limit: 20,
          total: 1,
        },
      },
    });
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          id: 'search-2',
          name: 'Backend',
          query: null,
          filters: {},
          context: {},
          createdAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      },
    });
    deleteMock.mockResolvedValueOnce({ data: { status: 'success' } });

    const list = await recommendationsService.listSavedSearches();
    const created = await recommendationsService.createSavedSearch({ name: 'Backend' });
    await recommendationsService.deleteSavedSearch('search-1');

    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations/saved-searches',
      expect.objectContaining({ params: { page: 1, limit: 20 } }),
    );
    expect(postMock).toHaveBeenCalledWith(
      '/job-recommendations/saved-searches',
      { name: 'Backend', filters: {} },
      expect.objectContaining({ signal: undefined }),
    );
    expect(deleteMock).toHaveBeenCalledWith('/job-recommendations/saved-searches/search-1');
    expect(list.items).toHaveLength(1);
    expect(created.id).toBe('search-2');
  });

  it('loads readiness lifecycle status with retrieval metadata', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          ready: true,
          lifecycleState: 'READY',
          canGenerateFromProfile: true,
          blockers: [],
          stale: false,
          lastGeneratedAt: '2026-08-02T00:00:00.000Z',
          retrieval: {
            backend: 'PGVECTOR',
            configured: true,
            embeddingCoverageRatio: 0.9,
          },
        },
      },
    });

    const result = await recommendationsService.getReadiness();

    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations/status',
      expect.objectContaining({ signal: undefined }),
    );
    expect(result).toMatchObject({
      ready: true,
      lifecycleState: 'READY',
      canGenerateFromProfile: true,
      retrieval: { backend: 'PGVECTOR', configured: true },
    });
  });

  it('rejects invalid readiness lifecycle payloads', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          ready: true,
          lifecycleState: 'DONE',
          canGenerateFromProfile: true,
          blockers: [],
          retrieval: { backend: 'PGVECTOR', configured: true },
        },
      },
    });

    await expect(recommendationsService.getReadiness()).rejects.toThrow(
      'Unexpected recommendation readiness response shape',
    );
  });
});
