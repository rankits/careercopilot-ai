import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app.js';
import { prisma } from '@/shared/config/db.conf.js';
import { TokenService } from '@/modules/auth/services/token.service.js';

describe('GET /api/v1/extension/answers', () => {
  let token: string;
  let testUserId: number;
  let testUserPrincipalId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        firstName: 'Extension',
        lastName: 'Tester',
        email: 'extension.tester@example.com',
        role: { connect: { name: 'USER' } },
        status: 'Active',
      },
    });
    testUserId = user.id;
    testUserPrincipalId = String(user.id);

    // Create answers
    await prisma.applicationAnswerProfile.createMany({
      data: [
        {
          userId: testUserPrincipalId,
          questionKey: 'years_of_experience',
          answer: '5 years',
          sensitive: false,
        },
        {
          userId: testUserPrincipalId,
          questionKey: 'github_url',
          answer: 'https://github.com/extension',
          sensitive: false,
        },
        {
          userId: testUserPrincipalId,
          questionKey: 'gender',
          answer: 'Male',
          sensitive: true, // Sensitive!
        },
      ],
    });

    // Generate token
    const access = TokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: 'USER',
      tokenVersion: user.tokenVersion,
    });
    token = access.token;
  });

  afterEach(async () => {
    await prisma.applicationAnswerProfile.deleteMany({ where: { userId: testUserPrincipalId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('should return non-sensitive answers and filter out sensitive ones', async () => {
    const res = await request(app)
      .get('/api/v1/extension/answers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    // Check that normal keys are returned
    expect(res.body.data.answers['years_of_experience']).toBe('5 years');
    expect(res.body.data.answers['github_url']).toBe('https://github.com/extension');

    // Check that sensitive keys are filtered
    expect(res.body.data.answers['gender']).toBeUndefined();

    // Check contentGenerationAllowed
    expect(res.body.data.contentGenerationAllowed).toBe(false);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/extension/answers');
    expect(res.status).toBe(401);
  });
});
