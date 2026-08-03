import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { accessTokenForUser, authHeader, seedVerifiedUser } from '@/test-utils/fixtures.js';

const API = '/api/v1/jobs-ingestion';

beforeEach(async () => {
  await resetTestState();
});

describe('administrative job ingestion routes', () => {
  it('rejects anonymous health and trigger requests', async () => {
    const [health, trigger] = await Promise.all([
      request(app).get(`${API}/health`),
      request(app).post(`${API}/trigger`).send({}),
    ]);

    expect(health.status).toBe(401);
    expect(trigger.status).toBe(401);
  });

  it('rejects a USER principal before triggering provider ingestion', async () => {
    const user = await seedVerifiedUser();
    const token = accessTokenForUser(user);

    const response = await request(app).post(`${API}/trigger`).set(authHeader(token)).send({});

    expect(response.status).toBe(403);
    expect(response.body.status).toBe('error');
  });
});
