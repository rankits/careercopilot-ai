import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import app from '@/test-utils/app.js';
import {
  aiMailDraftService,
  aiMailGenerationReadinessService,
  mailDeliveryService,
} from '@/modules/ai-mail/routes/ai-mail.route.js';
import type {
  AiMailDraft,
  AiMailGenerationReadinessDto,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { resetTestState } from '@/test-utils/reset.js';

const API = '/api/v1/ai-mail/drafts';
const DRAFT_ID = '22222222-2222-4222-8222-222222222222';
const RESUME_ID = '11111111-1111-4111-8111-111111111111';

const draft = (userId: string): AiMailDraft => ({
  id: DRAFT_ID,
  userId,
  recruiterEmail: 'recruiter@example.com',
  jobDescription: 'Build accessible web applications.',
  resumeId: RESUME_ID,
  constraints: {
    tone: 'professional',
    maximumWords: 250,
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: ['salary expectations'],
  },
  subject: 'Frontend developer application',
  bodyText: 'Hello, I am interested in this role.',
  status: 'edited',
  version: 1,
  userEdited: true,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
});

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI Mail draft API', () => {
  it.each([
    ['get', API],
    ['post', API],
    ['get', `${API}/${DRAFT_ID}`],
    ['patch', `${API}/${DRAFT_ID}`],
    ['delete', `${API}/${DRAFT_ID}`],
    ['post', `${API}/${DRAFT_ID}/mark-ready`],
    ['get', `${API}/${DRAFT_ID}/send-preview`],
    ['post', `${API}/${DRAFT_ID}/send`],
    ['get', '/api/v1/ai-mail/resumes'],
    ['get', '/api/v1/ai-mail/profile-summary'],
    ['get', `${API}/${DRAFT_ID}/generation-readiness`],
  ] as const)('%s %s requires authentication', async (method, path) => {
    const response = await request(app)[method](path).set('x-user-id', 'spoofed-user').send({});
    expect(response.status).toBe(401);
  });

  it('returns readiness without exposing full context or evidence', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-ready@example.com' });
    const readiness: AiMailGenerationReadinessDto = {
      ready: true,
      blockers: [],
      warnings: [],
      profile: {
        exists: true,
        confirmed: true,
        candidateName: 'Ada',
        currentTitle: 'Engineer',
        topSkills: ['TypeScript', 'React'],
        fullNamePresent: true,
        currentRolePresent: true,
        locationPresent: false,
        skillCount: 2,
        experienceCount: 1,
        educationCount: 1,
        certificationCount: 0,
        achievementCount: 0,
        professionalLinkCount: 0,
        completenessPercent: 83,
        missingRecommendedSections: ['achievements'],
      },
      detectedJobMetadata: { roleTitle: 'Engineer' },
      suggestedJobMetadata: {},
      counts: {
        profileSkills: 2,
        resumeSkills: 3,
        experienceEntries: 1,
        jobRequirements: 2,
        jobResponsibilities: 1,
        jobKeywords: 4,
      },
      contextHash: 'a'.repeat(64),
    };
    const spy = vi.spyOn(aiMailGenerationReadinessService, 'evaluate').mockResolvedValue(readiness);

    const response = await request(app)
      .get(`${API}/${DRAFT_ID}/generation-readiness`)
      .set(authHeader(accessTokenForUser(user)));

    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(String(user.id), DRAFT_ID);
    expect(response.body.data).toEqual(readiness);
    expect(JSON.stringify(response.body)).not.toMatch(/trustBoundary|evidence|jobDescription/);
  });

  it('preserves owned-draft 404 semantics for readiness', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-missing-ready@example.com' });
    vi.spyOn(aiMailGenerationReadinessService, 'evaluate').mockRejectedValue(
      new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND'),
    );

    const response = await request(app)
      .get(`${API}/${DRAFT_ID}/generation-readiness`)
      .set(authHeader(accessTokenForUser(user)));

    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty('data.context');
  });

  it('creates a draft for the authenticated user', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-create@example.com' });
    const created = draft(String(user.id));
    const spy = vi.spyOn(aiMailDraftService, 'create').mockResolvedValue(created);

    const response = await request(app)
      .post(API)
      .set(authHeader(accessTokenForUser(user)))
      .send({
        recruiterEmail: 'Recruiter@Example.com',
        jobDescription: 'Build accessible web applications.',
        resumeId: RESUME_ID,
      });

    expect(response.status).toBe(201);
    expect(spy).toHaveBeenCalledWith(
      String(user.id),
      expect.objectContaining({ recruiterEmail: 'recruiter@example.com' }),
    );
  });

  it.each([
    [{ recruiterEmail: 'invalid', jobDescription: 'Role', resumeId: RESUME_ID }],
    [
      {
        recruiterEmail: 'recruiter@example.com',
        jobDescription: 'Role',
        resumeId: RESUME_ID,
        jobUrl: 'javascript:alert(1)',
      },
    ],
  ])('rejects invalid create input', async (payload) => {
    const user = await seedVerifiedUser({ email: 'ai-mail-invalid@example.com' });
    const response = await request(app)
      .post(API)
      .set(authHeader(accessTokenForUser(user)))
      .send(payload);
    expect(response.status).toBe(400);
  });

  it('returns anti-enumeration not-found for a foreign resume', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-foreign-resume@example.com' });
    vi.spyOn(aiMailDraftService, 'create').mockRejectedValue(
      new AppError('Resume not found', 404, 'AI_MAIL_RESUME_NOT_FOUND'),
    );

    const response = await request(app)
      .post(API)
      .set(authHeader(accessTokenForUser(user)))
      .send({
        recruiterEmail: 'recruiter@example.com',
        jobDescription: 'Role',
        resumeId: RESUME_ID,
      });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('AI_MAIL_RESUME_NOT_FOUND');
  });

  it('does not reveal a foreign draft', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-foreign-draft@example.com' });
    vi.spyOn(aiMailDraftService, 'get').mockRejectedValue(
      new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND'),
    );

    const response = await request(app)
      .get(`${API}/${DRAFT_ID}`)
      .set(authHeader(accessTokenForUser(user)));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('AI_MAIL_DRAFT_NOT_FOUND');
  });

  it('returns paginated drafts scoped to the authenticated user', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-list@example.com' });
    const spy = vi.spyOn(aiMailDraftService, 'list').mockResolvedValue({
      items: [draft(String(user.id))],
      page: 2,
      limit: 5,
      total: 6,
    });

    const response = await request(app)
      .get(`${API}?page=2&limit=5`)
      .set(authHeader(accessTokenForUser(user)));

    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      String(user.id),
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it('surfaces version conflicts without overwriting content', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-conflict@example.com' });
    vi.spyOn(aiMailDraftService, 'update').mockRejectedValue(
      new AppError('AI Mail draft version conflict', 409, 'AI_MAIL_DRAFT_VERSION_CONFLICT'),
    );

    const response = await request(app)
      .patch(`${API}/${DRAFT_ID}`)
      .set(authHeader(accessTokenForUser(user)))
      .send({ version: 1, subject: 'Updated subject' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('AI_MAIL_DRAFT_VERSION_CONFLICT');
  });

  it('archives and marks ready using the supplied version', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-lifecycle@example.com' });
    const archived = { ...draft(String(user.id)), status: 'archived' as const, version: 2 };
    const ready = { ...draft(String(user.id)), status: 'ready_to_send' as const, version: 2 };
    const archiveSpy = vi.spyOn(aiMailDraftService, 'archive').mockResolvedValue(archived);
    const readySpy = vi.spyOn(aiMailDraftService, 'markReady').mockResolvedValue(ready);
    const token = accessTokenForUser(user);

    const archiveResponse = await request(app)
      .delete(`${API}/${DRAFT_ID}`)
      .set(authHeader(token))
      .send({ version: 1 });
    const readyResponse = await request(app)
      .post(`${API}/${DRAFT_ID}/mark-ready`)
      .set(authHeader(token))
      .send({ version: 1 });

    expect(archiveResponse.status).toBe(200);
    expect(readyResponse.status).toBe(200);
    expect(archiveSpy).toHaveBeenCalledWith(String(user.id), DRAFT_ID, 1);
    expect(readySpy).toHaveBeenCalledWith(String(user.id), DRAFT_ID, 1);
  });

  it('rejects send when mail sending is disabled (fail closed)', async () => {
    const user = await seedVerifiedUser({ email: 'ai-mail-send-off@example.com' });
    vi.spyOn(mailDeliveryService, 'sendApprovedDraft').mockRejectedValue(
      new AppError('Mail sending is disabled', 403, 'MAIL_SENDING_DISABLED'),
    );

    const response = await request(app)
      .post(`${API}/${DRAFT_ID}/send`)
      .set(authHeader(accessTokenForUser(user)))
      .send({
        version: 2,
        contentHash: 'a'.repeat(64),
        connectedAccountId: 1,
        idempotencyKey: 'idem-send-test-1',
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('MAIL_SENDING_DISABLED');
  });
});
