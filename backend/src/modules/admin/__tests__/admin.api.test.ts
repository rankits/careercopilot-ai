import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Status } from '@prisma/client';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  seedAdmin,
  seedVerifiedUser,
  VALID_PASSWORD,
  accessTokenForAdmin,
  accessTokenForUser,
  authHeader,
} from '@/test-utils/fixtures.js';

const API = '/api/v1/admin';

beforeEach(async () => {
  await resetTestState();
});

describe('POST /admin/auth/login', () => {
  describe('Given an active admin account', () => {
    describe('When logging in with the correct password', () => {
      it('Then a 200 with the admin profile and a token pair is returned', async () => {
        const admin = await seedAdmin({ email: 'admin-login@example.com' });

        const res = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.data.admin.email).toBe(admin.email);
        expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
        expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
      });
    });

    describe('When logging in with the wrong password', () => {
      it('Then a 401 is returned and the failed-attempt counter increments', async () => {
        const admin = await seedAdmin({ email: 'admin-wrong@example.com' });

        const res = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: 'NotIt!12345' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
        expect(fakeDb.admins.find((a) => a.email === admin.email)?.failedLoginAttempts).toBe(1);
      });
    });

    describe('When the wrong password is submitted enough times to cross the lockout threshold', () => {
      it('Then the admin account is locked, rejecting even the correct password', async () => {
        const admin = await seedAdmin({ email: 'admin-lockout@example.com' });

        for (let attempt = 0; attempt < 5; attempt++) {
          await request(app)
            .post(`${API}/auth/login`)
            .send({ email: admin.email, password: 'NotIt!12345' });
        }

        const res = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });

        expect(res.status).toBe(423);
        expect(res.body.code).toBe('ACCOUNT_LOCKED');
      });
    });
  });

  describe('Given a suspended admin account', () => {
    describe('When logging in with the correct password', () => {
      it('Then a 403 ACCOUNT_NOT_ACTIVE error is returned', async () => {
        const admin = await seedAdmin({
          email: 'admin-suspended@example.com',
          status: Status.Suspended,
        });

        const res = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
      });
    });
  });

  describe('Given no admin account exists with this email', () => {
    describe('When attempting to log in', () => {
      it('Then a 401 invalid-credentials error is returned', async () => {
        const res = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: 'nobody-admin@example.com', password: VALID_PASSWORD });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      });
    });
  });
});

describe('POST /admin/auth/refresh-token', () => {
  describe('Given a valid, active admin session', () => {
    describe("When refreshing with that session's refresh token", () => {
      it('Then new tokens are issued and the old refresh token is rotated out', async () => {
        const admin = await seedAdmin({ email: 'admin-refresh@example.com' });
        const loginRes = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });
        const oldRefreshToken = loginRes.body.data.tokens.refreshToken as string;

        const refreshRes = await request(app)
          .post(`${API}/auth/refresh-token`)
          .send({ refreshToken: oldRefreshToken });

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.data.accessToken).toEqual(expect.any(String));
        expect(refreshRes.body.data.refreshToken).not.toBe(oldRefreshToken);
      });
    });
  });

  describe('Given a refresh token that was already rotated (reused)', () => {
    describe('When it is presented again', () => {
      it('Then the reuse is detected and every session for that admin is revoked', async () => {
        const admin = await seedAdmin({ email: 'admin-reuse@example.com' });
        const loginRes = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });
        const originalRefreshToken = loginRes.body.data.tokens.refreshToken as string;

        await request(app)
          .post(`${API}/auth/refresh-token`)
          .send({ refreshToken: originalRefreshToken });

        const reuseRes = await request(app)
          .post(`${API}/auth/refresh-token`)
          .send({ refreshToken: originalRefreshToken });

        expect(reuseRes.status).toBe(401);
        expect(reuseRes.body.code).toBe('TOKEN_REUSE_DETECTED');

        const stored = fakeDb.admins.find((a) => a.email === admin.email);
        const sessions = fakeDb.adminSessions.filter((s) => s.adminId === stored?.id);
        expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
      });
    });
  });
});

describe('POST /admin/auth/logout', () => {
  describe('Given an active admin session', () => {
    describe("When logging out with that session's refresh token", () => {
      it('Then the session is revoked', async () => {
        const admin = await seedAdmin({ email: 'admin-logout@example.com' });
        const loginRes = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });
        const refreshToken = loginRes.body.data.tokens.refreshToken as string;

        const logoutRes = await request(app).post(`${API}/auth/logout`).send({ refreshToken });
        expect(logoutRes.status).toBe(200);

        const secondRefreshAttempt = await request(app)
          .post(`${API}/auth/refresh-token`)
          .send({ refreshToken });
        expect(secondRefreshAttempt.status).toBe(401);
      });
    });
  });
});

describe('POST /admin/auth/logout-all', () => {
  describe('Given an admin with multiple active sessions', () => {
    describe('When calling logout-all from one of them', () => {
      it('Then every session is revoked and previously issued access tokens stop working', async () => {
        const admin = await seedAdmin({ email: 'admin-logout-all@example.com' });
        const firstLogin = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });
        const secondLogin = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: VALID_PASSWORD });

        const logoutAllRes = await request(app)
          .post(`${API}/auth/logout-all`)
          .set(authHeader(firstLogin.body.data.tokens.accessToken));
        expect(logoutAllRes.status).toBe(200);

        const staleFirst = await request(app)
          .get(`${API}/auth/me`)
          .set(authHeader(firstLogin.body.data.tokens.accessToken));
        const staleSecond = await request(app)
          .get(`${API}/auth/me`)
          .set(authHeader(secondLogin.body.data.tokens.accessToken));
        expect(staleFirst.status).toBe(401);
        expect(staleSecond.status).toBe(401);
      });
    });
  });
});

describe('POST /admin/auth/change-password', () => {
  describe('Given an authenticated admin', () => {
    describe('When the current password is correct', () => {
      it('Then the password changes and all sessions are revoked', async () => {
        const admin = await seedAdmin({ email: 'admin-change-pass@example.com' });
        const token = accessTokenForAdmin(admin);

        const res = await request(app)
          .post(`${API}/auth/change-password`)
          .set(authHeader(token))
          .send({ currentPassword: VALID_PASSWORD, newPassword: 'Brand!NewAdmin1' });

        expect(res.status).toBe(200);

        const staleMe = await request(app).get(`${API}/auth/me`).set(authHeader(token));
        expect(staleMe.status).toBe(401);

        const loginRes = await request(app)
          .post(`${API}/auth/login`)
          .send({ email: admin.email, password: 'Brand!NewAdmin1' });
        expect(loginRes.status).toBe(200);
      });
    });

    describe('When the current password is wrong', () => {
      it('Then a 401 is returned', async () => {
        const admin = await seedAdmin({ email: 'admin-change-wrong@example.com' });
        const token = accessTokenForAdmin(admin);

        const res = await request(app)
          .post(`${API}/auth/change-password`)
          .set(authHeader(token))
          .send({ currentPassword: 'WrongOne!1234', newPassword: 'Brand!NewAdmin1' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      });
    });
  });
});

describe('GET /admin/auth/me', () => {
  describe('Given an authenticated admin', () => {
    describe('When requesting the current session', () => {
      it("Then the admin's own profile is returned", async () => {
        const admin = await seedAdmin({ email: 'admin-me@example.com', firstName: 'Adriana' });
        const token = accessTokenForAdmin(admin);

        const res = await request(app).get(`${API}/auth/me`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(admin.email);
        expect(res.body.data.firstName).toBe('Adriana');
      });
    });
  });

  describe('Given a caller authenticated as a USER principal, not an ADMIN', () => {
    describe('When requesting an admin-only endpoint', () => {
      it('Then a 403 forbidden is returned (principal-type gate)', async () => {
        const user = await seedVerifiedUser({ email: 'not-an-admin@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/auth/me`).set(authHeader(token));

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When requesting an admin-only endpoint', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).get(`${API}/auth/me`);
        expect(res.status).toBe(401);
      });
    });
  });
});

describe('GET /admin/stats', () => {
  describe('Given an authenticated admin and a mix of platform accounts', () => {
    describe('When requesting system statistics', () => {
      it('Then accurate counts are returned', async () => {
        const admin = await seedAdmin({ email: 'admin-stats@example.com' });
        const token = accessTokenForAdmin(admin);
        await seedVerifiedUser({ email: 'stats-active1@example.com' });
        await seedVerifiedUser({ email: 'stats-active2@example.com' });
        await seedVerifiedUser({
          email: 'stats-pending@example.com',
          status: Status.PendingVerification,
          isEmailVerified: false,
        });

        const res = await request(app).get(`${API}/stats`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.totalUsers).toBe(3);
        expect(res.body.data.activeUsers).toBe(2);
        expect(res.body.data.pendingVerificationUsers).toBe(1);
        expect(res.body.data.totalAdmins).toBe(1);
      });
    });
  });
});
