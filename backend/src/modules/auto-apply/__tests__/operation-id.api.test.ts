import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationPlannerService } from '@/modules/auto-apply/controllers/planner.controller.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import { jobPageAnalyzerService } from '@/modules/auto-apply/wiring/analysis.wiring.js';
import { isValidOperationId } from '@/modules/auto-apply/utils/operation-id.util.js';

const PLAN_API = '/api/v1/auto-apply/plan';
const JOB_ID = '00000000-0000-4000-8000-000000000099';
const ANALYSIS_API = `/api/v1/auto-apply/jobs/${JOB_ID}/analysis`;
const CLIENT_OP_ID = '550e8400-e29b-41d4-a716-446655440000';

const samplePlan = {
  application: { id: 'jobapp-1', userId: 'user-1', status: 'READY_FOR_REVIEW' },
  decision: 'READY_FOR_REVIEW' as const,
  channel: 'EXTERNAL_MANUAL' as const,
  eligibility: { eligible: true, checks: [] },
  selectedResumeVersion: null,
  unresolvedQuestions: [],
  contentGenerationAvailable: false,
  coverLetter: null,
  screeningAnswers: [],
  contentWarnings: [],
  readiness: { decision: 'READY', blockingReasons: [] },
};

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('X-Operation-Id on analyze/prepare/plan (AA-014)', () => {
  it('returns a server-generated X-Operation-Id on plan create when header is absent', async () => {
    const user = await seedVerifiedUser({ email: 'opid-gen@example.com' });
    const token = accessTokenForUser(user);
    vi.spyOn(applicationPlannerService, 'createPlan').mockResolvedValue(samplePlan as never);
    vi.spyOn(autoApplyEventService, 'record').mockResolvedValue();

    const res = await request(app).post(PLAN_API).set(authHeader(token)).send({ jobId: JOB_ID });

    expect(res.status).toBe(200);
    const header = res.headers['x-operation-id'];
    expect(typeof header).toBe('string');
    expect(isValidOperationId(header)).toBe(true);
  });

  it('echoes a valid client X-Operation-Id and includes it in audit metadata', async () => {
    const user = await seedVerifiedUser({ email: 'opid-echo@example.com' });
    const token = accessTokenForUser(user);
    vi.spyOn(applicationPlannerService, 'createPlan').mockResolvedValue(samplePlan as never);
    const recordSpy = vi.spyOn(autoApplyEventService, 'record').mockResolvedValue();

    const res = await request(app)
      .post(PLAN_API)
      .set(authHeader(token))
      .set('X-Operation-Id', CLIENT_OP_ID)
      .send({ jobId: JOB_ID });

    expect(res.status).toBe(200);
    expect(res.headers['x-operation-id']).toBe(CLIENT_OP_ID);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ operationId: CLIENT_OP_ID }),
      }),
    );
  });

  it('regenerates when client X-Operation-Id is malformed', async () => {
    const user = await seedVerifiedUser({ email: 'opid-bad@example.com' });
    const token = accessTokenForUser(user);
    vi.spyOn(applicationPlannerService, 'createPlan').mockResolvedValue(samplePlan as never);
    vi.spyOn(autoApplyEventService, 'record').mockResolvedValue();

    const res = await request(app)
      .post(PLAN_API)
      .set(authHeader(token))
      .set('X-Operation-Id', 'not-a-uuid')
      .send({ jobId: JOB_ID });

    expect(res.status).toBe(200);
    expect(res.headers['x-operation-id']).not.toBe('not-a-uuid');
    expect(isValidOperationId(res.headers['x-operation-id'])).toBe(true);
  });

  it('returns X-Operation-Id on analysis create', async () => {
    const user = await seedVerifiedUser({ email: 'opid-analysis@example.com' });
    const token = accessTokenForUser(user);
    vi.spyOn(jobPageAnalyzerService, 'analyzeOrGetFresh').mockResolvedValue({
      id: 'analysis-1',
      jobId: JOB_ID,
    } as never);

    const res = await request(app)
      .post(ANALYSIS_API)
      .set(authHeader(token))
      .set('X-Operation-Id', CLIENT_OP_ID)
      .send({});

    expect(res.status).toBe(200);
    expect(res.headers['x-operation-id']).toBe(CLIENT_OP_ID);
  });
});
