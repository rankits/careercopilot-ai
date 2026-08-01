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

    const result = await recommendationsService.list({ page: 2, limit: 10 });
    expect(getMock).toHaveBeenCalledWith(
      '/job-recommendations',
      expect.objectContaining({ params: { page: 2, limit: 10 } }),
    );
    expect(result.total).toBe(21);
    expect(result.items).toHaveLength(1);
  });

  it('posts PROFILE generate without auto sourceId', async () => {
    postMock.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    const items = await recommendationsService.generateFromProfile();
    expect(postMock).toHaveBeenCalledWith('/job-recommendations', { sourceType: 'PROFILE' });
    expect(items).toHaveLength(1);
  });
});
