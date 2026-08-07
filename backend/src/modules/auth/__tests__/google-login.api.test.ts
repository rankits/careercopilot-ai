import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Status } from '@prisma/client';

import { googleLoginAdapter } from '@/modules/auth/providers/google-login.adapter.js';
import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { extractCookie, seedVerifiedUser, VALID_PASSWORD } from '@/test-utils/fixtures.js';

const API = '/api/v1/auth';
const REFRESH_COOKIE = 'refreshToken';

const enableGoogleLogin = () => {
  env.GOOGLE_LOGIN_ENABLED = true;
  env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
  env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';
  env.GOOGLE_LOGIN_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';
  env.GOOGLE_LOGIN_SCOPES = 'openid,email,profile';
  env.GOOGLE_OAUTH_STATE_SIGNING_KEY = Buffer.alloc(32, 's').toString('base64');
  env.GOOGLE_OAUTH_STATE_TTL_SECONDS = 600;
};

beforeEach(async () => {
  await resetTestState();
  enableGoogleLogin();
  vi.restoreAllMocks();
});

afterEach(() => {
  env.GOOGLE_LOGIN_ENABLED = false;
  vi.restoreAllMocks();
});

describe('POST /auth/google/start', () => {
  it('returns a Google authorization URL and stores a login transaction', async () => {
    vi.spyOn(googleLoginAdapter, 'createAuthorizationUrl').mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
    );

    const res = await request(app).post(`${API}/google/start`).send({ returnPath: '/app' });

    expect(res.status).toBe(200);
    expect(res.body.data.authorizationUrl).toContain('accounts.google.com');
    expect(fakeDb.googleLoginTransactions).toHaveLength(1);
    expect(fakeDb.googleLoginTransactions[0]?.returnPath).toBe('/app');
    expect(fakeDb.connectedAccounts).toHaveLength(0);
    expect(fakeDb.oAuthTransactions).toHaveLength(0);
  });

  it('rejects when Google login is disabled', async () => {
    env.GOOGLE_LOGIN_ENABLED = false;

    const res = await request(app).post(`${API}/google/start`).send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('GOOGLE_LOGIN_DISABLED');
  });
});

describe('POST /auth/google/callback', () => {
  const startAndGetState = async (): Promise<string> => {
    vi.spyOn(googleLoginAdapter, 'createAuthorizationUrl').mockImplementation(({ state }) => {
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(state)}`;
    });

    const startRes = await request(app)
      .post(`${API}/google/start`)
      .send({ returnPath: '/jobs-feed' });
    expect(startRes.status).toBe(200);
    const url = new URL(startRes.body.data.authorizationUrl);
    return url.searchParams.get('state')!;
  };

  it('creates a Google-only user and issues a session', async () => {
    const state = await startAndGetState();
    vi.spyOn(googleLoginAdapter, 'exchangeAuthorizationCode').mockResolvedValue({
      googleSub: 'google-sub-new',
      email: 'new.google@example.com',
      emailVerified: true,
      firstName: 'New',
      lastName: 'Googler',
      avatarUrl: 'https://example.com/avatar.png',
    });

    const res = await request(app).post(`${API}/google/callback`).send({
      code: 'auth-code',
      state,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractCookie(res.headers['set-cookie'], REFRESH_COOKIE)).toBeDefined();
    expect(res.body.data.user.email).toBe('new.google@example.com');
    expect(res.body.data.returnPath).toBe('/jobs-feed');

    const created = fakeDb.users.find((u) => u.email === 'new.google@example.com');
    expect(created).toBeDefined();
    expect(created?.googleSub).toBe('google-sub-new');
    expect(created?.isEmailVerified).toBe(true);
    expect(created?.status).toBe(Status.Active);
    expect(fakeDb.userMetas.find((m) => m.userId === created?.id)).toBeUndefined();
    expect(fakeDb.connectedAccounts).toHaveLength(0);
  });

  it('links an existing email account and logs in', async () => {
    const existing = await seedVerifiedUser({ email: 'existing@example.com' });
    const state = await startAndGetState();
    vi.spyOn(googleLoginAdapter, 'exchangeAuthorizationCode').mockResolvedValue({
      googleSub: 'google-sub-link',
      email: existing.email,
      emailVerified: true,
      firstName: existing.firstName,
      lastName: existing.lastName,
    });

    const res = await request(app).post(`${API}/google/callback`).send({
      code: 'auth-code',
      state,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const updated = fakeDb.users.find((u) => u.id === existing.id);
    expect(updated?.googleSub).toBe('google-sub-link');
    expect(fakeDb.userMetas.find((m) => m.userId === existing.id)).toBeDefined();
    expect(fakeDb.connectedAccounts).toHaveLength(0);
  });

  it('rejects unverified Google emails', async () => {
    const state = await startAndGetState();
    vi.spyOn(googleLoginAdapter, 'exchangeAuthorizationCode').mockRejectedValue(
      new AppError('Google email is not verified', 400, 'GOOGLE_LOGIN_EMAIL_NOT_VERIFIED'),
    );

    const res = await request(app).post(`${API}/google/callback`).send({
      code: 'auth-code',
      state,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GOOGLE_LOGIN_EMAIL_NOT_VERIFIED');
    expect(fakeDb.users).toHaveLength(0);
  });

  it('blocks suspended accounts', async () => {
    const user = await seedVerifiedUser({
      email: 'suspended@example.com',
      status: Status.Suspended,
      googleSub: 'google-sub-suspended',
    });
    const state = await startAndGetState();
    vi.spyOn(googleLoginAdapter, 'exchangeAuthorizationCode').mockResolvedValue({
      googleSub: user.googleSub!,
      email: user.email,
      emailVerified: true,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const res = await request(app).post(`${API}/google/callback`).send({
      code: 'auth-code',
      state,
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('does not create Connected Accounts rows on login', async () => {
    await seedVerifiedUser({ email: 'password@example.com' }, VALID_PASSWORD);
    const state = await startAndGetState();
    vi.spyOn(googleLoginAdapter, 'exchangeAuthorizationCode').mockResolvedValue({
      googleSub: 'google-sub-password-user',
      email: 'password@example.com',
      emailVerified: true,
      firstName: 'Pass',
      lastName: 'Word',
    });

    const beforeConnected = fakeDb.connectedAccounts.length;
    const res = await request(app).post(`${API}/google/callback`).send({
      code: 'auth-code',
      state,
    });

    expect(res.status).toBe(200);
    expect(fakeDb.connectedAccounts).toHaveLength(beforeConnected);
    expect(fakeDb.oAuthTransactions).toHaveLength(0);
  });
});
