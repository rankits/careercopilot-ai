import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app.js';
import { prisma } from '@/shared/config/db.conf.js';
import { TokenService } from '@/modules/auth/services/token.service.js';
import crypto from 'crypto';

describe('POST /api/v1/extension/draft-answer', () => {
  let userId: string;
  let token: string;
  let noConsentUserId: string;
  let noConsentToken: string;

  beforeAll(async () => {
    // 1. Create a test user WITH consent
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Draft',
        lastName: 'Test',
        email: `draft-test-${Date.now()}@example.com`,
        passwordHash: 'dummy',
      },
    });
    // In auto-apply module, userId is often the string UUID from Auth layer,
    // but in some schemas it uses string version of ID or UUID. Let's create a UUID.
    userId = crypto.randomUUID();

    // Create an auth user to link
    await prisma.authUser.create({
      data: {
        id: userId,
        internalUserId: testUser.id,
      },
    });

    token = await TokenService.generateAccessToken({ id: userId, type: 'USER' });

    // Create consent
    await prisma.applicationConsent.create({
      data: {
        userId,
        consentType: 'CONTENT_GENERATION',
      },
    });

    // Create a resume and approve it
    const resume = await prisma.resume.create({
      data: {
        userId,
        extractedText: 'Software Engineer with 10 years of experience in Node.js',
        status: 'READY',
      },
    });

    await prisma.approvedResumeVersion.create({
      data: {
        userId,
        resumeId: resume.id,
        label: 'General',
        category: 'SWE',
        isActive: true,
      },
    });

    // 2. Create a test user WITHOUT consent
    const userNoConsent = await prisma.user.create({
      data: {
        firstName: 'No',
        lastName: 'Consent',
        email: `no-consent-${Date.now()}@example.com`,
        passwordHash: 'dummy',
      },
    });
    noConsentUserId = crypto.randomUUID();
    await prisma.authUser.create({
      data: {
        id: noConsentUserId,
        internalUserId: userNoConsent.id,
      },
    });
    noConsentToken = await TokenService.generateAccessToken({ id: noConsentUserId, type: 'USER' });
  });

  afterAll(async () => {
    await prisma.applicationConsent.deleteMany({
      where: { userId: { in: [userId, noConsentUserId] } },
    });
    await prisma.approvedResumeVersion.deleteMany({
      where: { userId: { in: [userId, noConsentUserId] } },
    });
    await prisma.resume.deleteMany({ where: { userId: { in: [userId, noConsentUserId] } } });
    await prisma.authUser.deleteMany({ where: { id: { in: [userId, noConsentUserId] } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'draft-test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'no-consent' } } });
  });

  it('should return 403 CONSENT_REQUIRED if consent is missing', async () => {
    const res = await request(app)
      .post('/api/v1/extension/draft-answer')
      .set('Authorization', `Bearer ${noConsentToken}`)
      .send({ question: 'Why do you want to work here?' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CONSENT_REQUIRED');
  });

  it('should return a drafted answer if consent is present and active resume exists', async () => {
    const res = await request(app)
      .post('/api/v1/extension/draft-answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'Why do you want to work here?' });

    expect(res.status).toBe(200);
    expect(res.body.data.draft).toBeDefined();
    expect(typeof res.body.data.draft).toBe('string');
    expect(res.body.data.requiresApproval).toBe(true);
  });

  it('should return 400 if question is missing', async () => {
    const res = await request(app)
      .post('/api/v1/extension/draft-answer')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
