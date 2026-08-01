import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// The upload route kicks off real parsing/storage as a fire-and-forget
// background job (`setImmediate`) after responding - neither is under test
// here (AUTH-BE-002 only cares who the resume gets attributed to), and
// letting the real ones run would hit disk and unmodelled FakeDb tables.
vi.mock('@/modules/resumes/services/resume-processing.service.js', () => ({
  resumeProcessingService: { processUploadedResume: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/modules/resumes/storage/resume-storage.factory.js', () => ({
  createResumeStorage: () => ({
    store: async (input: { key: string }) => ({
      key: input.key,
      url: `local://${input.key}`,
      driver: 'LOCAL' as const,
    }),
  }),
}));

import app, { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  seedVerifiedUser,
  seedResume,
  seedResumeExtraction,
  seedCandidateProfile,
  accessTokenForUser,
  expiredAccessTokenForUser,
  authHeader,
} from '@/test-utils/fixtures.js';

const API = '/api/v1/resumes';

beforeEach(async () => {
  await resetTestState();
});

describe('Authentication is required on private resume routes (AUTH-BE-001)', () => {
  describe('Given no Authorization header', () => {
    describe('When any private resume route is called', () => {
      it('Then GET /profiles/:userId returns 401 and does not reach the controller', async () => {
        const res = await request(app).get(`${API}/profiles/some-user`);
        expect(res.status).toBe(401);
      });

      it('Then POST /profile/:userId (confirm) returns 401', async () => {
        const res = await request(app)
          .post(`${API}/profile/some-user`)
          .send({ resumeId: '11111111-1111-1111-1111-111111111111' });
        expect(res.status).toBe(401);
      });

      it('Then GET /:resumeId/status returns 401', async () => {
        const res = await request(app).get(`${API}/11111111-1111-1111-1111-111111111111/status`);
        expect(res.status).toBe(401);
      });

      it('Then POST /upload returns 401 before any file processing happens', async () => {
        const res = await request(app).post(`${API}/upload`);
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Given an expired access token', () => {
    describe('When a private resume route is called', () => {
      it('Then a 401 with code TOKEN_EXPIRED is returned', async () => {
        const user = await seedVerifiedUser({ email: 'expired@example.com' });
        const token = expiredAccessTokenForUser(user);

        const res = await request(app).get(`${API}/profiles/${user.id}`).set(authHeader(token));

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('TOKEN_EXPIRED');
      });
    });
  });

  describe('Given a valid access token', () => {
    describe('When a private resume route is called', () => {
      it('Then the request reaches the controller', async () => {
        const user = await seedVerifiedUser({ email: 'valid-token@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/profiles/${user.id}`).set(authHeader(token));

        // No profile exists yet - what matters is we got past auth (never 401).
        expect(res.status).toBe(404);
      });
    });
  });
});

describe('GET /resumes/profiles/:userId ownership (AUTH-BE-003)', () => {
  describe('Given an authenticated user requesting their own profile id', () => {
    describe('When the profile exists', () => {
      it('Then the profile is returned', async () => {
        const user = await seedVerifiedUser({ email: 'self-profile@example.com' });
        seedCandidateProfile({ userId: String(user.id), skills: ['Go'] });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/profiles/${user.id}`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.userId).toBe(String(user.id));
      });
    });
  });

  describe("Given an authenticated user requesting a different user's profile id", () => {
    describe('When the route is called', () => {
      it('Then a 403 is returned and no profile data is leaked', async () => {
        const caller = await seedVerifiedUser({ email: 'caller@example.com' });
        const other = await seedVerifiedUser({ email: 'other@example.com' });
        seedCandidateProfile({ userId: String(other.id), skills: ['SecretSkill'] });
        const token = accessTokenForUser(caller);

        const res = await request(app).get(`${API}/profiles/${other.id}`).set(authHeader(token));

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROFILE_ACCESS_DENIED');
        expect(JSON.stringify(res.body)).not.toContain('SecretSkill');
      });
    });
  });
});

describe('GET /resumes/:resumeId/status ownership (AUTH-BE-003)', () => {
  describe('Given a resume owned by the caller', () => {
    describe('When requesting its status', () => {
      it('Then the status is returned', async () => {
        const user = await seedVerifiedUser({ email: 'owns-resume@example.com' });
        const resume = seedResume({ userId: String(user.id), status: 'PROCESSED' });
        const token = accessTokenForUser(user);

        const res = await request(app).get(`${API}/${resume.id}/status`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(resume.id);
        expect(res.body.data.status).toBe('PROCESSED');
      });
    });
  });

  describe('Given a resume owned by a different user', () => {
    describe('When requesting its status', () => {
      it('Then a 404 is returned instead of leaking that the resume exists', async () => {
        const caller = await seedVerifiedUser({ email: 'not-owner@example.com' });
        const owner = await seedVerifiedUser({ email: 'resume-owner@example.com' });
        const resume = seedResume({ userId: String(owner.id) });
        const token = accessTokenForUser(caller);

        const res = await request(app).get(`${API}/${resume.id}/status`).set(authHeader(token));

        expect(res.status).toBe(404);
      });
    });
  });

  describe('Given a resumeId that does not exist at all', () => {
    describe('When requesting its status', () => {
      it('Then the same 404 shape is returned as the cross-owner case', async () => {
        const user = await seedVerifiedUser({ email: 'unknown-resume@example.com' });
        const token = accessTokenForUser(user);

        const res = await request(app)
          .get(`${API}/22222222-2222-2222-2222-222222222222/status`)
          .set(authHeader(token));

        expect(res.status).toBe(404);
      });
    });
  });
});

describe('POST /resumes/:resumeId/reparse ownership (AUTH-BE-003)', () => {
  describe('Given a resume owned by a different user', () => {
    describe('When the caller tries to reparse it', () => {
      it('Then a 404 is returned and no reparse is queued', async () => {
        const caller = await seedVerifiedUser({ email: 'reparse-caller@example.com' });
        const owner = await seedVerifiedUser({ email: 'reparse-owner@example.com' });
        const resume = seedResume({ userId: String(owner.id) });
        seedResumeExtraction({ resumeId: resume.id });
        const token = accessTokenForUser(caller);

        const res = await request(app)
          .post(`${API}/${resume.id}/reparse`)
          .set(authHeader(token))
          .send({});

        expect(res.status).toBe(404);
      });
    });
  });
});

describe('POST /resumes/upload derives identity from the token (AUTH-BE-002)', () => {
  describe('Given an authenticated user uploads with a spoofed body userId', () => {
    describe('When the upload completes', () => {
      it('Then the stored resume belongs to the caller, not the spoofed id', async () => {
        const caller = await seedVerifiedUser({ email: 'uploader@example.com' });
        const victim = await seedVerifiedUser({ email: 'victim@example.com' });
        const token = accessTokenForUser(caller);

        const res = await request(app)
          .post(`${API}/upload`)
          .set(authHeader(token))
          .field('userId', String(victim.id))
          .attach('resume', Buffer.from('%PDF-1.4 fake resume content'), {
            filename: 'resume.pdf',
            contentType: 'application/pdf',
          });

        expect(res.status).toBe(201);
        const stored = fakeDb.resumes.find((r) => r.id === res.body.data.id);
        expect(stored?.userId).toBe(String(caller.id));
        expect(stored?.userId).not.toBe(String(victim.id));
      });
    });
  });
});

describe('POST /resumes/profile/:userId confirm (AUTH-BE-002 / AUTH-BE-003)', () => {
  describe("Given user A confirms at another user's path (/profile/B)", () => {
    describe('When the request is made', () => {
      it('Then a 403 is returned and B is left unchanged', async () => {
        const userA = await seedVerifiedUser({ email: 'a@example.com' });
        const userB = await seedVerifiedUser({ email: 'b@example.com' });
        const resumeForA = seedResume({ userId: String(userA.id) });
        seedResumeExtraction({ resumeId: resumeForA.id });
        const token = accessTokenForUser(userA);

        const res = await request(app)
          .post(`${API}/profile/${userB.id}`)
          .set(authHeader(token))
          .send({ resumeId: resumeForA.id });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROFILE_ACCESS_DENIED');
        expect(fakeDb.candidateProfiles.find((p) => p.userId === String(userB.id))).toBeUndefined();
        const refreshedB = fakeDb.users.find((u) => u.id === userB.id);
        expect(refreshedB?.isProfileCreated).toBe(false);
      });
    });
  });

  describe("Given user A confirms their own profile using another user's resumeId", () => {
    describe('When the request is made', () => {
      it('Then a 404 is returned and no profile is created', async () => {
        const userA = await seedVerifiedUser({ email: 'a2@example.com' });
        const userB = await seedVerifiedUser({ email: 'b2@example.com' });
        const resumeForB = seedResume({ userId: String(userB.id) });
        seedResumeExtraction({ resumeId: resumeForB.id });
        const token = accessTokenForUser(userA);

        const res = await request(app)
          .post(`${API}/profile/${userA.id}`)
          .set(authHeader(token))
          .send({ resumeId: resumeForB.id });

        expect(res.status).toBe(404);
        expect(fakeDb.candidateProfiles.find((p) => p.userId === String(userA.id))).toBeUndefined();
      });
    });
  });

  describe('Given user A confirms their own profile with their own resumeId', () => {
    describe('When the resume has parsed extraction data', () => {
      it('Then the profile is created and isProfileCreated becomes true', async () => {
        const userA = await seedVerifiedUser({ email: 'a3@example.com' });
        const resume = seedResume({ userId: String(userA.id) });
        seedResumeExtraction({
          resumeId: resume.id,
          extractedData: { personalDetails: { fullName: 'A. User' }, skills: ['TypeScript'] },
        });
        const token = accessTokenForUser(userA);

        const res = await request(app)
          .post(`${API}/profile/${userA.id}`)
          .set(authHeader(token))
          .send({ resumeId: resume.id });

        expect(res.status).toBe(200);
        const profile = fakeDb.candidateProfiles.find((p) => p.userId === String(userA.id));
        expect(profile).toBeDefined();
        expect(profile?.confirmedAt).not.toBeNull();
        const refreshedA = fakeDb.users.find((u) => u.id === userA.id);
        expect(refreshedA?.isProfileCreated).toBe(true);
      });
    });
  });
});
