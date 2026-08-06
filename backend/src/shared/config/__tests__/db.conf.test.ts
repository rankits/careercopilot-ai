import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const instances: Array<{
    handlers: Record<string, (event: Record<string, unknown>) => void>;
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  return { instances };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    handlers: Record<string, (event: Record<string, unknown>) => void> = {};
    $connect = vi.fn(async () => {});
    $disconnect = vi.fn(async () => {});
    constructor() {
      h.instances.push(this as never);
    }
    $on(event: string, handler: (event: Record<string, unknown>) => void) {
      this.handlers[event] = handler;
    }
  },
  Prisma: {},
}));

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => loggerMock),
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: loggerMock,
  createChildLogger: vi.fn(),
}));

// db.conf.ts constructs its single client at module scope, so a top-level
// import here would bake in whatever `globalThis.prisma` was left behind by
// other test files. Loading the module inside each test after clearing the
// global keeps these specs deterministic and order-independent.
const load = async (nodeEnv = 'test') => {
  process.env.NODE_ENV = nodeEnv;
  (globalThis as Record<string, unknown>).prisma = undefined;
  h.instances.length = 0;
  vi.resetModules();
  return await import('@/shared/config/db.conf.js');
};

afterEach(() => {
  loggerMock.debug.mockClear();
  loggerMock.info.mockClear();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
});

describe('db.conf', () => {
  it('creates a shared PrismaClient with event log handlers', async () => {
    await load();
    expect(h.instances.length).toBe(1);
    const instance = h.instances[0];
    expect(instance.handlers.query).toBeTypeOf('function');
    expect(instance.handlers.warn).toBeTypeOf('function');
    expect(instance.handlers.error).toBeTypeOf('function');
  });

  it('logs query, warn and error events through the logger', async () => {
    await load();
    const instance = h.instances[0];
    instance.handlers.query({ query: 'SELECT 1', params: [], duration: 5 });
    expect(loggerMock.debug).toHaveBeenCalledWith(
      { query: 'SELECT 1', params: [], durationMs: 5 },
      'prisma query executed',
    );

    instance.handlers.warn({ message: 'warn message' });
    expect(loggerMock.warn).toHaveBeenCalledWith({ message: 'warn message' }, 'prisma warning');

    instance.handlers.error({ message: 'error message' });
    expect(loggerMock.error).toHaveBeenCalledWith({ message: 'error message' }, 'prisma error');
  });

  it('connectDatabase connects and logs', async () => {
    const { connectDatabase } = await load();
    await connectDatabase();
    expect(h.instances[0].$connect).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('PostgreSQL connected via Prisma');
  });

  it('disconnectDatabase disconnects and logs', async () => {
    const { disconnectDatabase } = await load();
    await disconnectDatabase();
    expect(h.instances[0].$disconnect).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('PostgreSQL disconnected');
  });

  it('reuses the existing global prisma instance instead of creating a new one', async () => {
    await load();
    const before = h.instances.length;
    vi.resetModules();
    await import('@/shared/config/db.conf.js');
    expect(h.instances.length).toBe(before);
  });

  it('does not set global.prisma when NODE_ENV is production', async () => {
    await load('production');
    expect((globalThis as Record<string, unknown>).prisma).toBeUndefined();
  });

  it('does set global.prisma when not in production', async () => {
    await load('test');
    expect((globalThis as Record<string, unknown>).prisma).toBeDefined();
  });
});
