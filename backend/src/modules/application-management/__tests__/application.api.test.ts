import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { seedVerifiedUser, accessTokenForUser, authHeader } from '@/test-utils/fixtures.js';
import { applicationService } from '@/modules/application-management/controllers/application.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/applications';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /applications authz', () => {
  describe('Given no authentication', () => {
    it('Then returns 401 even when x-user-id is supplied', async () => {
      const res = await request(app).get(API).set('x-user-id', 'spoofed-user');
      expect(res.status).toBe(401);
    });
  });

  describe('Given an authenticated user', () => {
    it('Then scopes listing to principalId and ignores x-user-id / query userId', async () => {
      const user = await seedVerifiedUser({ email: 'apps-owner@example.com' });
      const token = accessTokenForUser(user);

      const spy = vi.spyOn(applicationService, 'getApplications').mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app)
        .get(`${API}?userId=other-user`)
        .set(authHeader(token))
        .set('x-user-id', 'other-user');

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({ userId: user.publicId });
      expect(spy.mock.calls[0][0].userId).not.toBe('other-user');
    });
  });
});

describe('GET /applications/:id ownership', () => {
  describe('Given user A authenticated', () => {
    it('Then cross-user access surfaces as not found (no IDOR leak)', async () => {
      const user = await seedVerifiedUser({ email: 'apps-a@example.com' });
      const token = accessTokenForUser(user);

      vi.spyOn(applicationService, 'getApplicationById').mockRejectedValue(
        new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND'),
      );

      const res = await request(app)
        .get(`${API}/00000000-0000-4000-8000-000000000099`)
        .set(authHeader(token))
        .set('x-user-id', 'victim-user');

      expect(res.status).toBe(404);
      expect(applicationService.getApplicationById).toHaveBeenCalledWith(
        user.publicId,
        '00000000-0000-4000-8000-000000000099',
      );
    });
  });
});

describe('POST /applications authn', () => {
  describe('Given no authentication', () => {
    it('Then returns 401 and does not create via body.userId spoof', async () => {
      const spy = vi.spyOn(applicationService, 'createApplication');

      const res = await request(app).post(API).send({
        sourceType: 'MANUAL',
        jobTitle: 'Engineer',
        companyName: 'Acme',
        userId: 'spoofed-user',
      });

      expect(res.status).toBe(401);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Given an authenticated user', () => {
    it('Then create uses principalId only', async () => {
      const user = await seedVerifiedUser({ email: 'apps-create@example.com' });
      const token = accessTokenForUser(user);

      const spy = vi.spyOn(applicationService, 'createApplication').mockResolvedValue({
        id: 'app-1',
        userId: user.publicId,
        jobTitle: 'Engineer',
        companyName: 'Acme',
      } as never);

      const res = await request(app)
        .post(API)
        .set(authHeader(token))
        .set('x-user-id', 'other-user')
        .send({
          sourceType: 'MANUAL',
          jobTitle: 'Engineer',
          companyName: 'Acme',
          userId: 'other-user',
        });

      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith(
        user.publicId,
        expect.objectContaining({
          sourceType: 'MANUAL',
          jobTitle: 'Engineer',
          companyName: 'Acme',
        }),
      );
    });
  });
});
