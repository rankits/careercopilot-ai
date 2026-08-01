import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { jobListingService } from '@/modules/job-listing/index.js';

const API = '/api/v1/jobs';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /jobs/:jobId', () => {
  it('returns 404 when the job is not ACTIVE / not found', async () => {
    vi.spyOn(jobListingService, 'getJobDetails').mockResolvedValue(null);

    const res = await request(app).get(`${API}/00000000-0000-4000-8000-000000000001`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 200 with job payload for ACTIVE jobs', async () => {
    vi.spyOn(jobListingService, 'getJobDetails').mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Backend Engineer',
      companyName: 'Acme',
    } as never);

    const res = await request(app).get(`${API}/00000000-0000-4000-8000-000000000002`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Backend Engineer');
  });
});
