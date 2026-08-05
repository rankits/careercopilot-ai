import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import {
  jobApplicationRepository,
  jobPageAnalyzerService,
} from '@/modules/auto-apply/wiring/analysis.wiring.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';

const JOB_ID = '00000000-0000-4000-8000-000000000099';
const APP_A_ID = '00000000-0000-4000-8000-0000000000aa';
const APP_B_ID = '00000000-0000-4000-8000-0000000000bb';
const API = `/api/v1/auto-apply/jobs/${JOB_ID}/analysis/latest`;

const sharedAnalysis: ApplicationPageAnalysisDto = {
  id: 'analysis-1',
  jobId: JOB_ID,
  jobApplicationId: APP_A_ID,
  schemaVersion: 1,
  extractorVersion: 'deterministic-v2',
  extractionPolicyVersion: 'policy-v1',
  provider: 'UNKNOWN',
  jobPageUrl: 'https://example.com/jobs/1',
  applicationUrl: null,
  jobPageStatus: 'COMPLETE',
  formStatus: 'NOT_INSPECTED',
  submissionCapability: 'EXTERNAL_MANUAL',
  outcomeStatus: 'JOB_PAGE_ANALYZED',
  requirements: [
    {
      code: 'WORK_AUTH',
      value: true,
      importance: 'REQUIRED',
      assertion: 'REQUIRES',
      required: true,
      confidence: 0.9,
      evidenceStrength: 'EXPLICIT_TEXT',
      extractionMethod: 'DOM_RULE',
      sourceUrl: 'https://example.com/jobs/1',
      reviewStatus: 'AUTO_ACCEPTED',
    },
  ],
  fields: [],
  snapshot: {
    contentHash: 'abc',
    sanitizedTextLength: 10,
    httpStatus: 200,
    fetchedAt: '2026-08-05T00:00:00.000Z',
    finalUrl: 'https://example.com/jobs/1',
  },
  freshness: {},
  idempotencyKey: 'key-1',
  analyzedAt: '2026-08-05T00:00:00.000Z',
  expiresAt: '2026-08-12T00:00:00.000Z',
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
};

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply analysis/latest IDOR redaction (AA-012)', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
  });

  it('keeps jobApplicationId for the owner who triggered the analysis', async () => {
    const userA = await seedVerifiedUser({ email: 'analysis-owner@example.com' });
    const tokenA = accessTokenForUser(userA);

    vi.spyOn(jobPageAnalyzerService, 'getLatest').mockResolvedValue(sharedAnalysis);
    vi.spyOn(jobApplicationRepository, 'findByUserIdAndJobId').mockResolvedValue({
      id: APP_A_ID,
      userId: String(userA.id),
      jobId: JOB_ID,
    } as never);

    const res = await request(app).get(API).set(authHeader(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.data.jobApplicationId).toBe(APP_A_ID);
    expect(res.body.data.requirements).toEqual(sharedAnalysis.requirements);
  });

  it('redacts jobApplicationId for a different user while keeping shared content', async () => {
    const userB = await seedVerifiedUser({ email: 'analysis-other@example.com' });
    const tokenB = accessTokenForUser(userB);

    vi.spyOn(jobPageAnalyzerService, 'getLatest').mockResolvedValue(sharedAnalysis);
    vi.spyOn(jobApplicationRepository, 'findByUserIdAndJobId').mockResolvedValue({
      id: APP_B_ID,
      userId: String(userB.id),
      jobId: JOB_ID,
    } as never);

    const res = await request(app).get(API).set(authHeader(tokenB));

    expect(res.status).toBe(200);
    expect(res.body.data.jobApplicationId).toBeNull();
    expect(res.body.data.requirements).toEqual(sharedAnalysis.requirements);
    expect(res.body.data.id).toBe(sharedAnalysis.id);
  });

  it('redacts jobApplicationId when the viewer has no tracked application for the job', async () => {
    const userC = await seedVerifiedUser({ email: 'analysis-none@example.com' });
    const tokenC = accessTokenForUser(userC);

    vi.spyOn(jobPageAnalyzerService, 'getLatest').mockResolvedValue(sharedAnalysis);
    vi.spyOn(jobApplicationRepository, 'findByUserIdAndJobId').mockResolvedValue(null);

    const res = await request(app).get(API).set(authHeader(tokenC));

    expect(res.status).toBe(200);
    expect(res.body.data.jobApplicationId).toBeNull();
    expect(res.body.data.requirements).toEqual(sharedAnalysis.requirements);
  });

  it('returns null data when no analysis exists yet', async () => {
    const user = await seedVerifiedUser({ email: 'analysis-missing@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(jobPageAnalyzerService, 'getLatest').mockResolvedValue(null);
    const findSpy = vi.spyOn(jobApplicationRepository, 'findByUserIdAndJobId');

    const res = await request(app).get(API).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(findSpy).not.toHaveBeenCalled();
  });
});
