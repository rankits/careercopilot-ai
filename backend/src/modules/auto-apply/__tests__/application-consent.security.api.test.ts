import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { applicationConsentService } from '@/modules/auto-apply/controllers/application-consent.controller.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const API = '/api/v1/auto-apply/consents';
const CONSENT_ID = '00000000-0000-4000-8000-000000000099';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auto-apply consent IDOR / authz', () => {
  it.each([
    ['GET', API],
    ['POST', API],
    ['DELETE', `${API}/${CONSENT_ID}`],
  ] as const)('%s %s returns 401 without auth (x-user-id ignored)', async (method, path) => {
    const req = request(app)
      [method.toLowerCase() as 'get' | 'post' | 'delete'](path)
      .set('x-user-id', 'spoofed-user');
    const res = method === 'POST' ? await req.send({ consentType: 'RESUME_USAGE' }) : await req;
    expect(res.status).toBe(401);
  });

  it('rejects an invalid consentType with 400', async () => {
    const user = await seedVerifiedUser({ email: 'consent-invalid@example.com' });
    const token = accessTokenForUser(user);
    const spy = vi.spyOn(applicationConsentService, 'grantConsent');

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .send({ consentType: 'DEMOGRAPHIC_ANSWERS' });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('cross-user revoke uses caller principal and surfaces not found', async () => {
    const user = await seedVerifiedUser({ email: 'consent-attacker@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationConsentService, 'revokeConsent').mockRejectedValue(
      new AppError('Consent grant not found', 404, 'CONSENT_NOT_FOUND'),
    );

    const res = await request(app)
      .delete(`${API}/${CONSENT_ID}`)
      .set(authHeader(token))
      .set('x-user-id', 'victim-user');

    expect(res.status).toBe(404);
    expect(applicationConsentService.revokeConsent).toHaveBeenCalledWith(
      String(user.id),
      CONSENT_ID,
    );
  });

  it('grants consent scoped to the caller principal', async () => {
    const user = await seedVerifiedUser({ email: 'consent-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(applicationConsentService, 'grantConsent').mockResolvedValue({
      id: 'consent-1',
      userId: String(user.id),
      consentType: 'RESUME_USAGE',
      version: 1,
      grantedAt: new Date(),
      revokedAt: null,
    });

    const res = await request(app)
      .post(API)
      .set(authHeader(token))
      .set('x-user-id', 'other-user')
      .send({ consentType: 'RESUME_USAGE' });

    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledWith(String(user.id), 'RESUME_USAGE');
  });

  it.each(['EMAIL_SUBMISSION', 'AUTOPILOT_SUBMISSION'] as const)(
    'rejects grant of %s with 403 CONSENT_NOT_AVAILABLE_YET (AA-002)',
    async (consentType) => {
      const user = await seedVerifiedUser({
        email: `consent-unavailable-${consentType.toLowerCase()}@example.com`,
      });
      const token = accessTokenForUser(user);
      const grantSpy = vi.spyOn(applicationConsentService, 'grantConsent');

      const res = await request(app)
        .post(API)
        .set(authHeader(token))
        .send({ consentType });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_NOT_AVAILABLE_YET');
      expect(res.body.message).toBe("This consent type isn't available yet.");
      // Service was invoked (Zod enum still accepts the type) but rejected before persistence.
      expect(grantSpy).toHaveBeenCalledWith(String(user.id), consentType);
      await expect(grantSpy.mock.results[0]?.value).rejects.toMatchObject({
        code: 'CONSENT_NOT_AVAILABLE_YET',
      });
    },
  );

  it('still allows revoke of a legacy future-type grant (AA-002)', async () => {
    const user = await seedVerifiedUser({ email: 'consent-revoke-legacy@example.com' });
    const token = accessTokenForUser(user);

    vi.spyOn(applicationConsentService, 'revokeConsent').mockResolvedValue({
      id: CONSENT_ID,
      userId: String(user.id),
      consentType: 'AUTOPILOT_SUBMISSION',
      version: 1,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });

    const res = await request(app).delete(`${API}/${CONSENT_ID}`).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(applicationConsentService.revokeConsent).toHaveBeenCalledWith(
      String(user.id),
      CONSENT_ID,
    );
  });
});
