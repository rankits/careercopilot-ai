import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { seedVerifiedUser, accessTokenForUser, authHeader } from '@/test-utils/fixtures.js';
import { signAccessToken } from '@/shared/security/jwt.util.js';

const API = '/api/v1/users';

beforeEach(async () => {
  await resetTestState();
});

describe('GET /users/me', () => {
  describe('Given an authenticated user', () => {
    describe('When requesting their own profile', () => {
      it('Then their profile is returned', async () => {
        const user = await seedVerifiedUser({
          email: 'profile@example.com',
          firstName: 'Priya',
          bio: 'Backend engineer',
        });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/me`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(user.email);
        expect(res.body.data.firstName).toBe('Priya');
        expect(res.body.data.bio).toBe('Backend engineer');
        expect(res.body.data.id).toBe(user.publicId);
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When requesting the profile endpoint', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).get(`${API}/me`);
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Given the USER role has been stripped of the user.profile.read.own attribute', () => {
    describe('When an otherwise-valid user requests their own profile', () => {
      it('Then a 403 is returned (attribute-based RBAC gate, not just authentication)', async () => {
        const user = await seedVerifiedUser({ email: 'no-read-perm@example.com' });
        const token = accessTokenForUser(user);
        fakeDb.setRolePermissions('USER', []);

        const res = await request(app).get(`${API}/me`).set(authHeader(token));

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/user\.profile\.read\.own/);
      });
    });
  });

  describe('Given a valid access token naming a role that no longer exists', () => {
    describe('When requesting the profile endpoint', () => {
      it('Then permission resolution fails closed with a 403, never a bypass', async () => {
        const user = await seedVerifiedUser({ email: 'ghost-role@example.com' });
        const token = signAccessToken({
          sub: user.publicId,
          principalType: 'USER',
          email: user.email,
          role: 'DELETED_ROLE',
          tokenVersion: user.tokenVersion,
        });

        const res = await request(app).get(`${API}/me`).set(authHeader(token));

        expect(res.status).toBe(403);
      });
    });
  });
});

describe('PATCH /users/me', () => {
  describe('Given an authenticated user', () => {
    describe('When updating a single field', () => {
      it('Then only that field changes and the rest are left untouched', async () => {
        const user = await seedVerifiedUser({
          email: 'update-one@example.com',
          firstName: 'Original',
          lastName: 'Name',
        });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .patch(`${API}/me`)
          .set(authHeader(token))
          .send({ firstName: 'Changed' });

        expect(res.status).toBe(200);
        expect(res.body.data.firstName).toBe('Changed');
        expect(res.body.data.lastName).toBe('Name');

        const stored = fakeDb.users.find((u) => u.publicId === user.publicId);
        expect(stored?.firstName).toBe('Changed');
        expect(stored?.lastName).toBe('Name');
      });
    });

    describe('When updating several fields at once', () => {
      it('Then all of them are applied', async () => {
        const user = await seedVerifiedUser({ email: 'update-many@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).patch(`${API}/me`).set(authHeader(token)).send({
          bio: 'New bio',
          phone: '+14155552671',
          profileImage: 'https://example.com/a.png',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.bio).toBe('New bio');
        expect(res.body.data.phone).toBe('+14155552671');
        expect(res.body.data.profileImage).toBe('https://example.com/a.png');
      });
    });

    describe('When the request body is empty', () => {
      it('Then a 400 validation error is returned', async () => {
        const user = await seedVerifiedUser({ email: 'update-empty@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).patch(`${API}/me`).set(authHeader(token)).send({});

        expect(res.status).toBe(400);
      });
    });

    describe('When the phone number is not a valid E.164 number', () => {
      it('Then a 400 validation error is returned and nothing changes', async () => {
        const user = await seedVerifiedUser({ email: 'update-badphone@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .patch(`${API}/me`)
          .set(authHeader(token))
          .send({ phone: 'not-a-phone-number' });

        expect(res.status).toBe(400);
        expect(fakeDb.users.find((u) => u.publicId === user.publicId)?.phone).toBeNull();
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When attempting to update a profile', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).patch(`${API}/me`).send({ firstName: 'Nope' });
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Given the USER role has been stripped of the user.profile.update.own attribute', () => {
    describe('When an otherwise-valid user attempts to update their profile', () => {
      it('Then a 403 is returned and nothing changes', async () => {
        const user = await seedVerifiedUser({ email: 'no-update-perm@example.com' });
        const token = accessTokenForUser(user);
        fakeDb.setRolePermissions('USER', []);

        const res = await request(app)
          .patch(`${API}/me`)
          .set(authHeader(token))
          .send({ firstName: 'ShouldNotApply' });

        expect(res.status).toBe(403);
        expect(fakeDb.users.find((u) => u.publicId === user.publicId)?.firstName).not.toBe(
          'ShouldNotApply',
        );
      });
    });
  });
});

describe('GET /users (admin directory listing)', () => {
  describe('Given a caller whose role is ADMIN', () => {
    describe('When listing users', () => {
      it('Then a paginated directory of users is returned', async () => {
        const admin = await seedVerifiedUser({ email: 'admin-role@example.com', roleId: 2 });
        const adminToken = accessTokenForUser(admin);
        await seedVerifiedUser({ email: 'member1@example.com' });
        await seedVerifiedUser({ email: 'member2@example.com' });

        const res = await request(app).get(API).set(authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(3);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.total).toBe(3);
      });
    });

    describe('When listing users with a search term', () => {
      it('Then only matching users are returned', async () => {
        const admin = await seedVerifiedUser({ email: 'admin-role2@example.com', roleId: 2 });
        const adminToken = accessTokenForUser(admin);
        await seedVerifiedUser({ email: 'findme@example.com', firstName: 'Findable' });
        await seedVerifiedUser({ email: 'other@example.com', firstName: 'Other' });

        const res = await request(app)
          .get(API)
          .query({ search: 'Findable' })
          .set(authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].email).toBe('findme@example.com');
      });
    });

    describe('When listing users with pagination limits', () => {
      it('Then the page size is respected', async () => {
        const admin = await seedVerifiedUser({ email: 'admin-role3@example.com', roleId: 2 });
        const adminToken = accessTokenForUser(admin);
        for (let i = 0; i < 5; i++) {
          await seedVerifiedUser({ email: `paged${i}@example.com` });
        }

        const res = await request(app)
          .get(API)
          .query({ page: 1, limit: 2 })
          .set(authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(2);
        expect(res.body.data.total).toBe(6);
        expect(res.body.data.totalPages).toBe(3);
      });
    });
  });

  describe('Given a caller whose role is USER (not an admin)', () => {
    describe('When attempting to list users', () => {
      it('Then a 403 forbidden is returned', async () => {
        const user = await seedVerifiedUser({ email: 'regular-user@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(API).set(authHeader(token));

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When attempting to list users', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).get(API);
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Given the ADMIN role has been stripped of the user.manage.any attribute', () => {
    describe('When a caller whose role is ADMIN attempts to list users', () => {
      it('Then a 403 is returned - the permission attribute gates it, not the role name alone', async () => {
        const admin = await seedVerifiedUser({ email: 'admin-no-perm@example.com', roleId: 2 });
        const adminToken = accessTokenForUser(admin);
        fakeDb.setRolePermissions('ADMIN', []);

        const res = await request(app).get(API).set(authHeader(adminToken));

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/user\.manage\.any/);
      });
    });
  });
});
