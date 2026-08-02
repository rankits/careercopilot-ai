import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recommendationsService } from './recommendations.service';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: getMock,
    post: postMock,
  },
}));

describe('recommendationsService', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
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
});
