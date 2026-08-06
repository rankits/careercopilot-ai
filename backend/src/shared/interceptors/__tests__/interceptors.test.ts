import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const loggerMock = vi.hoisted(() => ({ info: vi.fn(), child: vi.fn() }));
const uuidMock = vi.hoisted(() => vi.fn(() => '00000000-0000-0000-0000-000000000000'));

vi.mock('@/shared/utils/logger.js', () => ({
  appLogger: loggerMock,
  jobsLogger: { child: vi.fn(), info: vi.fn() },
}));

// Node's other crypto exports are needed by express/supertest, so keep the
// real module and only override randomUUID (the interceptor imports it as a
// direct named binding, so a per-object spyOn never reaches it).
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomUUID: uuidMock };
});

import { requestInterceptor } from '@/shared/interceptors/request.interceptor.js';
import { responseInterceptor } from '@/shared/interceptors/response.interceptor.js';

beforeEach(() => {
  uuidMock.mockReset();
  uuidMock.mockImplementation(() => '00000000-0000-0000-0000-000000000000');
});

describe('requestInterceptor', () => {
  it('reuses an incoming x-request-id header when present', async () => {
    const app = express();
    app.use(requestInterceptor);
    app.get('/', (req, res) => res.json({ id: req.id }));

    const res = await request(app).get('/').set('x-request-id', 'upstream-id-123');
    expect(res.headers['x-request-id']).toBe('upstream-id-123');
    expect(res.body.id).toBe('upstream-id-123');
  });

  it('generates a fresh uuid when no header is present', async () => {
    uuidMock.mockReturnValueOnce('generated-uuid');

    const app = express();
    app.use(requestInterceptor);
    app.get('/', (req, res) => res.json({ id: req.id }));

    const res = await request(app).get('/');
    expect(res.headers['x-request-id']).toBe('generated-uuid');
    expect(res.body.id).toBe('generated-uuid');
  });

  it('ignores a blank header value', async () => {
    uuidMock.mockReturnValueOnce('fresh-uuid');

    const app = express();
    app.use(requestInterceptor);
    app.get('/', (req, res) => res.json({ id: req.id, startTime: typeof req.startTime }));

    const res = await request(app).get('/').set('x-request-id', '   ');
    expect(res.headers['x-request-id']).toBe('fresh-uuid');
    expect(res.body.startTime).toBe('number');
  });
});

describe('responseInterceptor', () => {
  beforeEach(() => {
    loggerMock.info.mockClear();
  });

  it('logs request completion and captures the response body', async () => {
    const app = express();
    app.use(responseInterceptor);
    app.get('/hello', (req, res) => res.status(201).json({ ok: true }));

    const res = await request(app).get('/hello');
    expect(res.status).toBe(201);

    await vi.waitFor(() => expect(loggerMock.info).toHaveBeenCalled());
    const [logContext, message] = loggerMock.info.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(message).toBe('API request completed');
    expect(logContext.method).toBe('GET');
    expect(logContext.route).toBe('/hello');
    expect(logContext.statusCode).toBe(201);
    expect(typeof logContext.durationMs).toBe('number');
    expect(res.body).toEqual({ ok: true });
  });

  it('defaults durationMs to 0 when req.startTime is unset', async () => {
    const app = express();
    app.use(responseInterceptor);
    app.get('/plain', (_req, res) => res.send('plain body'));

    await request(app).get('/plain');
    await vi.waitFor(() => expect(loggerMock.info).toHaveBeenCalled());
    const [logContext] = loggerMock.info.mock.calls[0] as [Record<string, unknown>];
    expect(logContext.durationMs).toBe(0);
    expect(logContext.statusCode).toBe(200);
  });
});
