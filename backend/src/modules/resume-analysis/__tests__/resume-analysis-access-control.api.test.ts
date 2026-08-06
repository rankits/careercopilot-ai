import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';

const API = '/api/v1/resume-analysis';
const RESUME_ID = '11111111-1111-1111-1111-111111111111';

beforeEach(async () => {
  await resetTestState();
});

describe('Authentication is required on every resume-analysis route (OWASP A01)', () => {
  describe('Given no Authorization header', () => {
    const cases: Array<[string, () => request.Test]> = [
      ['GET /saved-versions', () => request(app).get(`${API}/saved-versions`)],
      ['GET /saved-versions/:versionId', () => request(app).get(`${API}/saved-versions/1`)],
      ['DELETE /saved-versions/:versionId', () => request(app).delete(`${API}/saved-versions/1`)],
      ['POST /:resumeId/analyze', () => request(app).post(`${API}/${RESUME_ID}/analyze`).send({})],
      ['GET /:resumeId/analysis', () => request(app).get(`${API}/${RESUME_ID}/analysis`)],
      ['PATCH /:resumeId/step', () => request(app).patch(`${API}/${RESUME_ID}/step`).send({})],
      ['GET /:resumeId/keywords', () => request(app).get(`${API}/${RESUME_ID}/keywords`)],
      ['GET /:resumeId/suggestions', () => request(app).get(`${API}/${RESUME_ID}/suggestions`)],
      [
        'POST /:resumeId/suggestions/:id/apply',
        () => request(app).post(`${API}/${RESUME_ID}/suggestions/1/apply`).send({}),
      ],
      [
        'POST /:resumeId/suggestions/:id/ignore',
        () => request(app).post(`${API}/${RESUME_ID}/suggestions/1/ignore`).send({}),
      ],
      [
        'PATCH /:resumeId/content',
        () => request(app).patch(`${API}/${RESUME_ID}/content`).send({}),
      ],
      ['POST /:resumeId/recheck', () => request(app).post(`${API}/${RESUME_ID}/recheck`)],
      [
        'POST /:resumeId/versions',
        () => request(app).post(`${API}/${RESUME_ID}/versions`).send({}),
      ],
      ['GET /:resumeId/versions', () => request(app).get(`${API}/${RESUME_ID}/versions`)],
      ['GET /:resumeId/export', () => request(app).get(`${API}/${RESUME_ID}/export`)],
    ];

    it.each(cases)('Then %s returns 401 and never reaches the controller', async (_label, run) => {
      const res = await run();
      expect(res.status).toBe(401);
    });
  });
});
