import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const h = vi.hoisted(() => {
  const nopMiddleware = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    queryRaw: vi.fn(),
    cachePing: vi.fn(),
    busPing: vi.fn(),
    env: {
      ENABLE_EMAIL_WORKER: false,
      HEALTH_CHECK_RABBITMQ: false,
      ENABLE_SWAGGER: false,
    },
    middleware: nopMiddleware,
  };
});

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: { $queryRaw: h.queryRaw },
  default: { $queryRaw: h.queryRaw },
}));

vi.mock('@/infrastructure/cache/index.js', () => ({
  cacheService: { ping: h.cachePing },
}));

vi.mock('@/infrastructure/messaging/index.js', () => ({
  messageBus: { ping: h.busPing },
}));

vi.mock('@/shared/config/env.conf.js', () => ({ env: h.env }));
vi.mock('@/shared/config/swagger.conf.js', () => ({ swaggerSpec: {} }));

vi.mock('@/preMiddlewares.js', () => ({ default: h.middleware }));
vi.mock('@/securityMiddlewares.js', () => ({ default: h.middleware }));
vi.mock('@/routes.js', () => ({ default: h.middleware }));
vi.mock('@/shared/middlewares/errorHandler.js', () => ({ errorHandler: h.middleware }));
vi.mock('@/shared/middlewares/endpointNotFound.js', () => ({ endpointNotFound: h.middleware }));
vi.mock('@/shared/middlewares/rateLimiter.js', () => ({ globalRateLimiter: h.middleware }));
vi.mock('@/shared/interceptors/response.interceptor.js', () => ({
  responseInterceptor: h.middleware,
}));

import app from '@/app.js';

beforeEach(() => {
  h.queryRaw.mockReset();
  h.cachePing.mockReset();
  h.busPing.mockReset();
  h.env.ENABLE_EMAIL_WORKER = false;
  h.env.HEALTH_CHECK_RABBITMQ = false;
  h.env.ENABLE_SWAGGER = false;
  h.queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  h.cachePing.mockResolvedValue(true);
  h.busPing.mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app /health', () => {
  it('returns 200 ok when database and cache are healthy', async () => {
    const res = await request(app as never).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks).toMatchObject({ database: 'ok', cache: 'ok' });
  });

  it('reports database down as 503 degraded', async () => {
    h.queryRaw.mockRejectedValue(new Error('db down'));
    const res = await request(app as never).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe('down');
  });

  it('reports cache down when ping fails or returns falsy', async () => {
    h.cachePing.mockResolvedValue(false);
    const res = await request(app as never).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.checks.cache).toBe('down');
  });

  it('includes rabbitmq when ENABLE_EMAIL_WORKER is on and it is up', async () => {
    h.env.ENABLE_EMAIL_WORKER = true;
    const res = await request(app as never).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.checks.rabbitmq).toBe('ok');
  });

  it('reports rabbitmq down when HEALTH_CHECK_RABBITMQ is on and ping fails', async () => {
    h.env.HEALTH_CHECK_RABBITMQ = true;
    h.busPing.mockResolvedValue(false);
    const res = await request(app as never).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.checks.rabbitmq).toBe('down');
  });
});
