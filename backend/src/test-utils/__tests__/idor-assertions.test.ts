import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';
import { describeRequiresAuth } from '@/test-utils/idor-assertions.js';

const API = '/api/v1/auto-apply/profile';

beforeEach(async () => {
  await resetTestState();
});

describe('describeRequiresAuth', () => {
  describeRequiresAuth(app, [
    { method: 'get', path: API },
    { method: 'put', path: API, body: {} },
  ]);

  it('does not flag an authenticated request as unauthorized (sanity check on the helper itself)', async () => {
    const user = await seedVerifiedUser({ email: 'idor-helper-sanity@example.com' });
    const token = accessTokenForUser(user);

    const res = await request(app).get(API).set(authHeader(token));

    expect(res.status).not.toBe(401);
  });
});
