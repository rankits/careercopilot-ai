import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  seedVerifiedUser,
  seedCandidateProfile,
  accessTokenForUser,
  authHeader,
} from '@/test-utils/fixtures.js';

const API = '/api/v1/resumes';

beforeEach(async () => {
  await resetTestState();
});

describe('GET /resumes/profile/me', () => {
  describe('Given an authenticated user with a confirmed candidate profile', () => {
    describe('When requesting their own candidate profile', () => {
      it('Then the full profile data is returned', async () => {
        const user = await seedVerifiedUser({ email: 'candidate@example.com' });
        seedCandidateProfile({
          userId: user.publicId,
          personalDetails: { fullName: 'Jane Doe', phone: '+14155552671' },
          skills: ['TypeScript', 'React'],
        });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/profile/me`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.userId).toBe(user.publicId);
        expect(res.body.data.personalDetails.fullName).toBe('Jane Doe');
        expect(res.body.data.skills).toEqual(['TypeScript', 'React']);
        expect(res.body.data.isComplete).toBe(true);
      });
    });
  });

  describe('Given an authenticated user with no candidate profile yet', () => {
    describe('When requesting their own candidate profile', () => {
      it('Then a 404 is returned', async () => {
        const user = await seedVerifiedUser({ email: 'no-profile@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/profile/me`).set(authHeader(token));

        expect(res.status).toBe(404);
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When requesting the candidate profile endpoint', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app).get(`${API}/profile/me`);
        expect(res.status).toBe(401);
      });
    });
  });
});

describe('PATCH /resumes/profile/me', () => {
  describe('Given an authenticated user with an existing candidate profile', () => {
    describe('When updating a single field', () => {
      it('Then only that field changes and the rest are left untouched', async () => {
        const user = await seedVerifiedUser({ email: 'update-one@example.com' });
        seedCandidateProfile({
          userId: user.publicId,
          personalDetails: { fullName: 'Original Name' },
          skills: ['Node.js'],
        });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .patch(`${API}/profile/me`)
          .set(authHeader(token))
          .send({ skills: ['Node.js', 'AWS'] });

        expect(res.status).toBe(200);
        expect(res.body.data.skills).toEqual(['Node.js', 'AWS']);
        expect(res.body.data.personalDetails.fullName).toBe('Original Name');
      });
    });

    describe('When updating several fields at once', () => {
      it('Then all of them are applied and persisted', async () => {
        const user = await seedVerifiedUser({ email: 'update-many@example.com' });
        seedCandidateProfile({ userId: user.publicId });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .patch(`${API}/profile/me`)
          .set(authHeader(token))
          .send({
            personalDetails: { fullName: 'Updated Name', phone: '+14155552671' },
            education: [{ institution: 'MIT' }],
            certifications: [{ name: 'AWS Certified' }],
          });

        expect(res.status).toBe(200);
        expect(res.body.data.personalDetails.fullName).toBe('Updated Name');
        expect(res.body.data.education).toEqual([{ institution: 'MIT' }]);
        expect(res.body.data.certifications).toEqual([{ name: 'AWS Certified' }]);

        const stored = fakeDb.candidateProfiles.find((p) => p.userId === user.publicId);
        expect((stored?.personalDetails as { fullName?: string })?.fullName).toBe('Updated Name');
      });
    });

    describe('When the request body is empty', () => {
      it('Then a 400 validation error is returned', async () => {
        const user = await seedVerifiedUser({ email: 'update-empty@example.com' });
        seedCandidateProfile({ userId: user.publicId });
        const token = accessTokenForUser(user);

        const res = await request(app).patch(`${API}/profile/me`).set(authHeader(token)).send({});

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Given an authenticated user with no candidate profile yet', () => {
    describe('When attempting to update', () => {
      it('Then a 404 is returned', async () => {
        const user = await seedVerifiedUser({ email: 'update-missing@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .patch(`${API}/profile/me`)
          .set(authHeader(token))
          .send({ skills: ['Go'] });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('Given no authentication', () => {
    describe('When attempting to update a candidate profile', () => {
      it('Then a 401 is returned', async () => {
        const res = await request(app)
          .patch(`${API}/profile/me`)
          .send({ skills: ['Go'] });
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Given the USER role has been stripped of the resume.update.own attribute', () => {
    describe('When an otherwise-valid user attempts to update their candidate profile', () => {
      it('Then a 403 is returned and nothing changes', async () => {
        const user = await seedVerifiedUser({ email: 'no-update-perm@example.com' });
        seedCandidateProfile({ userId: user.publicId, skills: ['Original'] });
        const token = accessTokenForUser(user);
        fakeDb.setRolePermissions('USER', []);

        const res = await request(app)
          .patch(`${API}/profile/me`)
          .set(authHeader(token))
          .send({ skills: ['ShouldNotApply'] });

        expect(res.status).toBe(403);
        expect(fakeDb.candidateProfiles.find((p) => p.userId === user.publicId)?.skills).toEqual([
          'Original',
        ]);
      });
    });
  });
});
