import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { describeRequiresAuth } from '@/test-utils/idor-assertions.js';
import { assistedApplyWorkspaceService } from '@/modules/auto-apply/controllers/assisted-apply-workspace.controller.js';
import {
  assistedApplyHandoffService,
  resumeAnalysisService,
  resumeSelectionService,
} from '@/modules/auto-apply/controllers/assisted-apply-resume-handoff.controller.js';
import { assistedApplyCompletionService } from '@/modules/auto-apply/controllers/assisted-apply-completion.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/submissions';
const APP_ID = '00000000-0000-4000-8000-000000000091';
const notFound = () =>
  new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * AA-091 — Phase 1 endpoint auth + IDOR matrix.
 * Cross-user checks spy ownership-scoped services to return 404 (never 403).
 */
describe('Phase 1 Assisted Apply security IDOR suite (AA-091)', () => {
  describeRequiresAuth(app, [
    { method: 'get', path: `${API}/${APP_ID}/workspace` },
    {
      method: 'patch',
      path: `${API}/${APP_ID}/progress-step`,
      body: { progressStep: 'open' },
    },
    {
      method: 'patch',
      path: `${API}/${APP_ID}/resume-selection`,
      body: { resumeVersionId: '00000000-0000-4000-8000-000000000001' },
    },
    { method: 'post', path: `${API}/${APP_ID}/resume-analysis`, body: {} },
    { method: 'post', path: `${API}/${APP_ID}/handoff`, body: {} },
    { method: 'post', path: `${API}/${APP_ID}/mark-applied`, body: {} },
    {
      method: 'post',
      path: `${API}/${APP_ID}/abandon`,
      body: { reasonCode: 'NOT_INTERESTED' },
    },
    { method: 'post', path: `${API}/${APP_ID}/report-broken-link`, body: {} },
  ]);

  it('cross-user workspace GET returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-ws@example.com' });
    vi.spyOn(assistedApplyWorkspaceService, 'getWorkspace').mockRejectedValue(notFound());
    const res = await request(app)
      .get(`${API}/${APP_ID}/workspace`)
      .set(authHeader(accessTokenForUser(attacker)));
    expect(res.status).toBe(404);
  });

  it('cross-user progress-step PATCH returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-progress@example.com' });
    vi.spyOn(assistedApplyWorkspaceService, 'updateProgressStep').mockRejectedValue(notFound());
    const res = await request(app)
      .patch(`${API}/${APP_ID}/progress-step`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({ progressStep: 'open' });
    expect(res.status).toBe(404);
  });

  it('cross-user resume-selection PATCH returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-resume-sel@example.com' });
    vi.spyOn(resumeSelectionService, 'selectResume').mockRejectedValue(notFound());
    const res = await request(app)
      .patch(`${API}/${APP_ID}/resume-selection`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({ resumeVersionId: '00000000-0000-4000-8000-000000000001' });
    expect(res.status).toBe(404);
  });

  it('cross-user resume-analysis POST returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-resume-an@example.com' });
    vi.spyOn(resumeAnalysisService, 'analyze').mockRejectedValue(notFound());
    const res = await request(app)
      .post(`${API}/${APP_ID}/resume-analysis`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({});
    expect(res.status).toBe(404);
  });

  it('cross-user handoff POST returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-handoff@example.com' });
    vi.spyOn(assistedApplyHandoffService, 'handoff').mockRejectedValue(notFound());
    const res = await request(app)
      .post(`${API}/${APP_ID}/handoff`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({});
    expect(res.status).toBe(404);
  });

  it('cross-user mark-applied POST returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-mark@example.com' });
    vi.spyOn(assistedApplyCompletionService, 'markApplied').mockRejectedValue(notFound());
    const res = await request(app)
      .post(`${API}/${APP_ID}/mark-applied`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({});
    expect(res.status).toBe(404);
  });

  it('cross-user abandon POST returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-abandon@example.com' });
    vi.spyOn(assistedApplyCompletionService, 'abandon').mockRejectedValue(notFound());
    const res = await request(app)
      .post(`${API}/${APP_ID}/abandon`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({ reasonCode: 'NOT_INTERESTED' });
    expect(res.status).toBe(404);
  });

  it('cross-user report-broken-link POST returns 404', async () => {
    const attacker = await seedVerifiedUser({ email: 'aa091-broken@example.com' });
    vi.spyOn(assistedApplyCompletionService, 'reportBrokenLink').mockRejectedValue(notFound());
    const res = await request(app)
      .post(`${API}/${APP_ID}/report-broken-link`)
      .set(authHeader(accessTokenForUser(attacker)))
      .send({});
    expect(res.status).toBe(404);
  });
});
