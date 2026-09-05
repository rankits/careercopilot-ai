import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { OtpPurpose, Status } from '@prisma/client';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { findQueuedEmail } from '@/test-utils/messaging-mock.js';
import {
  seedVerifiedUser,
  seedUnverifiedUser,
  VALID_PASSWORD,
  accessTokenForUser,
  authHeader,
  extractCookie,
} from '@/test-utils/fixtures.js';

const API = '/api/v1/auth';
const REFRESH_COOKIE = 'refreshToken';

beforeEach(async () => {
  await resetTestState();
});

describe('POST /auth/register', () => {
  describe('Given no account exists with this email', () => {
    describe('When a valid registration request is submitted', () => {
      it('Then the account is created active/verified and a session is issued immediately, no OTP involved', async () => {
        const email = 'new.user@example.com';

        const res = await request(app).post(`${API}/register`).send({
          email,
          password: VALID_PASSWORD,
          firstName: 'New',
          lastName: 'User',
        });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.user.email).toBe(email);
        expect(res.body.data.user.isEmailVerified).toBe(true);
        expect(res.body.data.user.status).toBe(Status.Active);
        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(extractCookie(res.headers['set-cookie'], REFRESH_COOKIE)).toBeDefined();

        const created = fakeDb.users.find((u) => u.email === email);
        expect(created).toBeDefined();
        expect(created?.isEmailVerified).toBe(true);
        expect(created?.status).toBe(Status.Active);

        expect(findQueuedEmail(email, 'OTP')).toBeUndefined();
        expect(findQueuedEmail(email, 'WELCOME')).toBeDefined();
      });
    });

    describe('When the password does not meet the password policy', () => {
      it('Then a 400 validation error is returned and no account is created', async () => {
        const res = await request(app).post(`${API}/register`).send({
          email: 'weak@example.com',
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Pass',
        });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
        expect(fakeDb.users).toHaveLength(0);
      });
    });
  });

  describe('Given a fully verified account already exists with this email', () => {
    describe('When registering again with the same email', () => {
      it('Then a 409 conflict is returned', async () => {
        const user = await seedVerifiedUser({ email: 'exists@example.com' });

        const res = await request(app).post(`${API}/register`).send({
          email: user.email,
          password: VALID_PASSWORD,
          firstName: 'Whoever',
          lastName: 'Else',
        });

        expect(res.status).toBe(409);
        expect(res.body.status).toBe('error');
        expect(res.body.code).toBe('CONFLICT');
      });
    });
  });

  describe('Given an unverified pending account already exists with this email', () => {
    describe('When registering again with updated details', () => {
      it('Then the pending account is updated in place, activated, and a session is issued', async () => {
        const user = await seedUnverifiedUser({ email: 'pending@example.com', firstName: 'Old' });

        const res = await request(app).post(`${API}/register`).send({
          email: user.email,
          password: VALID_PASSWORD,
          firstName: 'Updated',
          lastName: 'Name',
        });

        expect(res.status).toBe(201);
        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(fakeDb.users).toHaveLength(1);
        expect(fakeDb.users[0]?.firstName).toBe('Updated');
        expect(fakeDb.users[0]?.isEmailVerified).toBe(true);
        expect(fakeDb.users[0]?.status).toBe(Status.Active);
      });
    });
  });

  describe('Given a freshly registered user', () => {
    describe('When immediately logging in with the same credentials', () => {
      it('Then login succeeds without needing any verification step', async () => {
        const email = 'register-then-login@example.com';

        const registerRes = await request(app).post(`${API}/register`).send({
          email,
          password: VALID_PASSWORD,
          firstName: 'Register',
          lastName: 'ThenLogin',
        });
        expect(registerRes.status).toBe(201);

        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email, password: VALID_PASSWORD });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data.user.email).toBe(email);
        expect(loginRes.body.accessToken).toEqual(expect.any(String));
        expect(extractCookie(loginRes.headers['set-cookie'], REFRESH_COOKIE)).toBeDefined();
      });
    });
  });
});

describe('POST /auth/otp/resend', () => {
  describe('Given no account exists with this email', () => {
    describe('When resending any purpose of code', () => {
      it('Then the generic confirmation message is still returned, without leaking account existence', async () => {
        const res = await request(app)
          .post(`${API}/otp/resend`)
          .send({ email: 'nobody@example.com', purpose: OtpPurpose.Login });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(findQueuedEmail('nobody@example.com')).toBeUndefined();
      });
    });
  });

  describe('Given a registration purpose (no longer supported)', () => {
    describe('When requesting a resend for it', () => {
      it('Then a 400 validation error is returned', async () => {
        const user = await seedUnverifiedUser({ email: 'legacy-pending@example.com' });

        const res = await request(app)
          .post(`${API}/otp/resend`)
          .send({ email: user.email, purpose: OtpPurpose.Registration });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });
    });
  });
});

describe('POST /auth/login', () => {
  describe('Given a verified, active account', () => {
    describe('When logging in with the correct password', () => {
      it('Then a 200 with an access token and refresh cookie is returned', async () => {
        const user = await seedVerifiedUser({ email: 'login-ok@example.com' });

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe(user.email);
        expect(res.body.data.user.isProfileCreated).toBe(false);
        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(extractCookie(res.headers['set-cookie'], REFRESH_COOKIE)).toBeDefined();
      });

      it('Then isProfileCreated is true when the user flag is set', async () => {
        const user = await seedVerifiedUser({
          email: 'login-with-profile@example.com',
          isProfileCreated: true,
        });

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.data.user.isProfileCreated).toBe(true);
      });
    });

    describe('When logging in with the wrong password', () => {
      it('Then a 401 is returned and the failed-attempt counter increments', async () => {
        const user = await seedVerifiedUser({ email: 'wrong-pass@example.com' });

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: 'TotallyWrong!1' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
        expect(fakeDb.users.find((u) => u.email === user.email)?.failedLoginAttempts).toBe(1);
      });
    });

    describe('When the wrong password is submitted enough times to cross the lockout threshold', () => {
      it('Then the account is locked, and even the correct password is then rejected', async () => {
        const user = await seedVerifiedUser({ email: 'lockout@example.com' });

        for (let attempt = 0; attempt < 5; attempt++) {
          await request(app)
            .post(`${API}/login`)
            .send({ email: user.email, password: 'TotallyWrong!1' });
        }

        expect(fakeDb.users.find((u) => u.email === user.email)?.lockedUntil).not.toBeNull();

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        expect(res.status).toBe(423);
        expect(res.body.code).toBe('ACCOUNT_LOCKED');
      });
    });
  });

  describe('Given an account that has not yet verified its email', () => {
    describe('When logging in with the correct password', () => {
      it('Then a 403 EMAIL_NOT_VERIFIED error is returned', async () => {
        const user = await seedUnverifiedUser({ email: 'unverified-login@example.com' });

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      });
    });
  });

  describe('Given a suspended account', () => {
    describe('When logging in with the correct password', () => {
      it('Then a 403 ACCOUNT_SUSPENDED error is returned', async () => {
        const user = await seedVerifiedUser({
          email: 'suspended@example.com',
          status: Status.Suspended,
        });

        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
      });
    });
  });

  describe('Given no account exists with this email', () => {
    describe('When attempting to log in', () => {
      it('Then a 401 invalid-credentials error is returned (no account enumeration)', async () => {
        const res = await request(app)
          .post(`${API}/login`)
          .send({ email: 'nobody@example.com', password: VALID_PASSWORD });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      });
    });
  });
});

describe('POST /auth/login/otp/request and /auth/login/otp/verify', () => {
  describe('Given a verified, active account', () => {
    describe('When requesting a login code and then submitting it correctly', () => {
      it('Then a session is issued', async () => {
        const user = await seedVerifiedUser({ email: 'otp-login@example.com' });

        const requestRes = await request(app)
          .post(`${API}/login/otp/request`)
          .send({ email: user.email });
        expect(requestRes.status).toBe(200);

        const code = findQueuedEmail(user.email, 'OTP')?.code as string;
        expect(code).toMatch(/^\d{6}$/);

        const verifyRes = await request(app)
          .post(`${API}/login/otp/verify`)
          .send({ email: user.email, code });

        if (verifyRes.status !== 200) console.log(verifyRes.body);
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.accessToken).toEqual(expect.any(String));
      });
    });

    describe('When submitting an incorrect code', () => {
      it('Then a 400 error is returned', async () => {
        const user = await seedVerifiedUser({ email: 'otp-login-wrong@example.com' });
        await request(app).post(`${API}/login/otp/request`).send({ email: user.email });

        const res = await request(app)
          .post(`${API}/login/otp/verify`)
          .send({ email: user.email, code: '000000' });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Given an unverified account', () => {
    describe('When requesting a login code', () => {
      it('Then the generic message is returned but no code is actually issued', async () => {
        const user = await seedUnverifiedUser({ email: 'otp-login-unverified@example.com' });

        const res = await request(app).post(`${API}/login/otp/request`).send({ email: user.email });

        expect(res.status).toBe(200);
        expect(findQueuedEmail(user.email, 'OTP')).toBeUndefined();
      });
    });
  });
});

describe('POST /auth/forgot-password and /auth/reset-password', () => {
  describe('Given a verified account', () => {
    describe('When requesting a password reset and submitting a new password with the correct code', () => {
      it('Then the password is changed, prior sessions are revoked, and the new password works', async () => {
        const user = await seedVerifiedUser({ email: 'reset-me@example.com' });

        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        const oldAccessToken = loginRes.body.accessToken as string;

        const forgotRes = await request(app)
          .post(`${API}/forgot-password`)
          .send({ email: user.email });
        expect(forgotRes.status).toBe(200);
        const code = findQueuedEmail(user.email, 'OTP')?.code as string;

        const newPassword = 'N3w!StrongPass';
        const resetRes = await request(app)
          .post(`${API}/reset-password`)
          .send({ email: user.email, code, newPassword });
        expect(resetRes.status).toBe(200);

        const oldPasswordLogin = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        expect(oldPasswordLogin.status).toBe(401);

        const newPasswordLogin = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: newPassword });
        expect(newPasswordLogin.status).toBe(200);

        const staleMeRes = await request(app).get(`${API}/me`).set(authHeader(oldAccessToken));
        expect(staleMeRes.status).toBe(401);
        expect(staleMeRes.body.code).toBe('TOKEN_REVOKED');
      });
    });

    describe('When submitting an incorrect reset code', () => {
      it('Then a 400 error is returned and the password is unchanged', async () => {
        const user = await seedVerifiedUser({ email: 'reset-wrong-code@example.com' });
        await request(app).post(`${API}/forgot-password`).send({ email: user.email });

        const res = await request(app)
          .post(`${API}/reset-password`)
          .send({ email: user.email, code: '000000', newPassword: 'Another!Pass1' });

        expect(res.status).toBe(400);

        const stillWorks = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        expect(stillWorks.status).toBe(200);
      });
    });
  });
});

describe('POST /auth/change-password', () => {
  describe('Given an authenticated user', () => {
    describe('When the current password is correct', () => {
      it('Then the password changes and all sessions (including the current token) are revoked', async () => {
        const user = await seedVerifiedUser({ email: 'change-pass@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .post(`${API}/change-password`)
          .set(authHeader(token))
          .send({ currentPassword: VALID_PASSWORD, newPassword: 'Brand!NewPass1' });

        expect(res.status).toBe(200);

        const meRes = await request(app).get(`${API}/me`).set(authHeader(token));
        expect(meRes.status).toBe(401);
        expect(meRes.body.code).toBe('TOKEN_REVOKED');

        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: 'Brand!NewPass1' });
        expect(loginRes.status).toBe(200);
      });
    });

    describe('When the current password is wrong', () => {
      it('Then a 401 is returned and the password is unchanged', async () => {
        const user = await seedVerifiedUser({ email: 'change-pass-wrong@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .post(`${API}/change-password`)
          .set(authHeader(token))
          .send({ currentPassword: 'NotItAtAll!1', newPassword: 'Brand!NewPass1' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When calling change-password', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app)
          .post(`${API}/change-password`)
          .send({ currentPassword: 'x', newPassword: 'Brand!NewPass1' });

        expect(res.status).toBe(401);
      });
    });
  });
});

describe('POST /auth/refresh-token', () => {
  describe('Given a valid, active session', () => {
    describe("When refreshing with the session's refresh cookie", () => {
      it('Then new tokens are issued and the old refresh token is rotated out', async () => {
        const user = await seedVerifiedUser({ email: 'refresh-me@example.com' });
        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        const oldRefreshToken = extractCookie(
          loginRes.headers['set-cookie'],
          REFRESH_COOKIE,
        ) as string;

        const refreshRes = await request(app)
          .post(`${API}/refresh-token`)
          .set('Cookie', `${REFRESH_COOKIE}=${oldRefreshToken}`);

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.accessToken).toEqual(expect.any(String));
        const newRefreshToken = extractCookie(refreshRes.headers['set-cookie'], REFRESH_COOKIE);
        expect(newRefreshToken).toBeDefined();
        expect(newRefreshToken).not.toBe(oldRefreshToken);
      });
    });
  });

  describe('Given a refresh token that was already rotated (reused)', () => {
    describe('When it is presented again', () => {
      it('Then the reuse is detected, rejected, and every session for that user is revoked', async () => {
        const user = await seedVerifiedUser({ email: 'reuse@example.com' });
        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        const originalRefreshToken = extractCookie(
          loginRes.headers['set-cookie'],
          REFRESH_COOKIE,
        ) as string;

        await request(app)
          .post(`${API}/refresh-token`)
          .set('Cookie', `${REFRESH_COOKIE}=${originalRefreshToken}`);

        const reuseRes = await request(app)
          .post(`${API}/refresh-token`)
          .set('Cookie', `${REFRESH_COOKIE}=${originalRefreshToken}`);

        expect(reuseRes.status).toBe(401);
        expect(reuseRes.body.code).toBe('TOKEN_REUSE_DETECTED');

        const stored = fakeDb.users.find((u) => u.email === user.email);
        const sessions = fakeDb.userSessions.filter((s) => s.userId === stored?.id);
        expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
      });
    });
  });

  describe('Given no refresh token at all', () => {
    describe('When calling refresh-token', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).post(`${API}/refresh-token`).send({});
        expect(res.status).toBe(401);
      });
    });
  });
});

describe('POST /auth/logout', () => {
  describe('Given an active session', () => {
    describe("When logging out with that session's refresh cookie", () => {
      it('Then the session is revoked and the cookie is cleared', async () => {
        const user = await seedVerifiedUser({ email: 'logout-me@example.com' });
        const loginRes = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        const refreshToken = extractCookie(
          loginRes.headers['set-cookie'],
          REFRESH_COOKIE,
        ) as string;

        const logoutRes = await request(app)
          .post(`${API}/logout`)
          .set('Cookie', `${REFRESH_COOKIE}=${refreshToken}`)
          .send({});

        expect(logoutRes.status).toBe(200);

        const stored = fakeDb.users.find((u) => u.email === user.email);
        const session = fakeDb.userSessions.find((s) => s.userId === stored?.id);
        expect(session?.revokedAt).not.toBeNull();

        const secondRefreshAttempt = await request(app)
          .post(`${API}/refresh-token`)
          .set('Cookie', `${REFRESH_COOKIE}=${refreshToken}`);
        expect(secondRefreshAttempt.status).toBe(401);
      });
    });
  });
});

describe('POST /auth/logout-all', () => {
  describe('Given a user with multiple active sessions', () => {
    describe('When calling logout-all from one of them', () => {
      it('Then every session is revoked and all previously issued access tokens stop working', async () => {
        const user = await seedVerifiedUser({ email: 'logout-all@example.com' });

        const firstLogin = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });
        const secondLogin = await request(app)
          .post(`${API}/login`)
          .send({ email: user.email, password: VALID_PASSWORD });

        const logoutAllRes = await request(app)
          .post(`${API}/logout-all`)
          .set(authHeader(firstLogin.body.accessToken));
        expect(logoutAllRes.status).toBe(200);

        const staleFirst = await request(app)
          .get(`${API}/me`)
          .set(authHeader(firstLogin.body.accessToken));
        const staleSecond = await request(app)
          .get(`${API}/me`)
          .set(authHeader(secondLogin.body.accessToken));
        expect(staleFirst.status).toBe(401);
        expect(staleSecond.status).toBe(401);

        const stored = fakeDb.users.find((u) => u.email === user.email);
        const sessions = fakeDb.userSessions.filter((s) => s.userId === stored?.id);
        expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
      });
    });
  });
});

describe('GET /auth/me', () => {
  describe('Given a valid access token', () => {
    describe('When requesting the current session', () => {
      it("Then the caller's own profile is returned", async () => {
        const user = await seedVerifiedUser({ email: 'me@example.com', firstName: 'Meredith' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/me`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(user.email);
        expect(res.body.data.firstName).toBe('Meredith');
        expect(res.body.data.id).toBe(user.id);
      });
    });
  });

  describe('Given no access token', () => {
    describe('When requesting the current session', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).get(`${API}/me`);
        expect(res.status).toBe(401);
      });
    });
  });
});
