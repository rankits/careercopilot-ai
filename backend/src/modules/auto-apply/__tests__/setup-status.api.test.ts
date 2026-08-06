import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { setupStatusService } from '@/modules/auto-apply/controllers/setup-status.controller.js';

const API = '/api/v1/auto-apply/setup-status';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/v1/auto-apply/setup-status', () => {
  it('returns 401 without auth (x-user-id ignored)', async () => {
    const res = await request(app).get(API).set('x-user-id', 'spoofed-user');
    expect(res.status).toBe(401);
  });

  it('returns setup status shape for authenticated user', async () => {
    const user = await seedVerifiedUser({ email: 'setup-status-owner@example.com' });
    const token = accessTokenForUser(user);

    const spy = vi.spyOn(setupStatusService, 'getSetupStatus').mockResolvedValue({
      complete: false,
      percent: 40,
      readyForAssistedApply: false,
      gaps: [
        {
          code: 'DESIRED_ROLES',
          label: 'Add at least one desired role',
          section: 'preferences',
        },
      ],
      sections: [
        { id: 'personal', label: 'Personal & contact details', complete: true, required: true },
        {
          id: 'work-auth',
          label: 'Work authorization & sponsorship',
          complete: false,
          required: true,
        },
        { id: 'preferences', label: 'Job preferences', complete: false, required: true },
        { id: 'links', label: 'Professional links', complete: true, required: false },
        { id: 'answers', label: 'Common answers', complete: false, required: true },
        { id: 'resumes', label: 'Resumes', complete: false, required: true },
        { id: 'education', label: 'Education', complete: true, required: false },
        { id: 'consents', label: 'Consents & privacy', complete: false, required: true },
      ],
    });

    const res = await request(app).get(API).set(authHeader(token)).set('x-user-id', 'victim-user');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({
      complete: false,
      percent: 40,
      readyForAssistedApply: false,
      gaps: expect.arrayContaining([
        expect.objectContaining({ code: 'DESIRED_ROLES', section: 'preferences' }),
      ]),
      sections: expect.arrayContaining([
        expect.objectContaining({ id: 'personal', required: true }),
        expect.objectContaining({ id: 'consents', required: true }),
      ]),
    });
    expect(spy).toHaveBeenCalledWith(String(user.id));
    expect(spy).not.toHaveBeenCalledWith('victim-user');
  });
});
