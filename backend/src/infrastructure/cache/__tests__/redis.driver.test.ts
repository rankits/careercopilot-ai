import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ioredisMock = vi.hoisted(() => ({
  Redis: vi.fn(),
  Cluster: vi.fn(),
}));

vi.mock('ioredis', () => ioredisMock);

import { RedisCacheDriver } from '@/infrastructure/cache/drivers/redis.driver.js';

type Handler = (...args: unknown[]) => void;

const makeClient = (overrides: Record<string, unknown> = {}) => {
  const handlers: Record<string, Handler> = {};
  return {
    on: vi.fn((event: string, handler: Handler) => {
      handlers[event] = handler;
    }),
    emit: (event: string, ...args: unknown[]) => {
      handlers[event]?.(...args);
    },
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn().mockResolvedValue(-1),
    ping: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
};

const Redis = ioredisMock.Redis;
const Cluster = ioredisMock.Cluster;

// The repo's .env (loaded via dotenv during module import) sets
// REDIS_HOST=redis; the driver reads these at construction time, so pin
// every knob here so tests are deterministic regardless of the ambient env.
const resetRedisEnv = () => {
  process.env.REDIS_MODE = 'standalone';
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
  delete process.env.REDIS_PASSWORD;
  delete process.env.REDIS_KEY_PREFIX;
  delete process.env.REDIS_CLUSTER_NODES;
  delete process.env.REDIS_SENTINELS;
  delete process.env.REDIS_SENTINEL_MASTER;
};

beforeEach(() => {
  resetRedisEnv();
  Redis.mockReset();
  Cluster.mockReset();
});

const construct = () => {
  const client = makeClient();
  Redis.mockImplementation(function () {
    return client as never;
  });
  const driver = new RedisCacheDriver();
  return { driver, client };
};

describe('RedisCacheDriver client creation', () => {
  it('builds a standalone client and exercises connection listeners', () => {
    const { client, driver } = construct();

    const opts = Redis.mock.calls[0][0] as { host: string; port: number; keyPrefix: string };
    expect(opts.host).toBe('127.0.0.1');
    expect(opts.port).toBe(6379);
    expect(client.on).toHaveBeenCalled();

    client.emit('connect');
    client.emit('ready');
    client.emit('error', new Error('boom'));
    client.emit('close');
    client.emit('end');
    client.emit('reconnecting', 120);

    expect(driver).toBeInstanceOf(RedisCacheDriver);
  });

  it('builds a cluster client from parsed node hosts', () => {
    process.env.REDIS_MODE = 'cluster';
    process.env.REDIS_CLUSTER_NODES = 'a.one:7000,host.two:7001';
    Cluster.mockImplementation(function () {
      return makeClient() as never;
    });

    new RedisCacheDriver();

    const nodes = Cluster.mock.calls[0][0] as { host: string; port: number }[];
    expect(nodes).toEqual([
      { host: 'a.one', port: 7000 },
      { host: 'host.two', port: 7001 },
    ]);
  });

  it('defaults to port 6379 when a cluster node port is unparseable', () => {
    process.env.REDIS_MODE = 'cluster';
    process.env.REDIS_CLUSTER_NODES = 'lonely-node';
    Cluster.mockImplementation(function () {
      return makeClient() as never;
    });

    new RedisCacheDriver();

    const nodes = Cluster.mock.calls[0][0] as { host: string; port: number }[];
    expect(nodes).toEqual([{ host: 'lonely-node', port: 6379 }]);
  });

  it('builds a sentinel client with sentinels and master name', () => {
    process.env.REDIS_MODE = 'sentinel';
    process.env.REDIS_SENTINELS = 's1:26379,s2:26380';
    process.env.REDIS_SENTINEL_MASTER = 'mymaster';
    Redis.mockImplementation(function () {
      return makeClient() as never;
    });

    new RedisCacheDriver();

    const [opts] = Redis.mock.calls[0] as [{ sentinels: unknown[]; name: string }];
    expect(opts.sentinels).toEqual([
      { host: 's1', port: 26379 },
      { host: 's2', port: 26380 },
    ]);
    expect(opts.name).toBe('mymaster');
  });
});

describe('RedisCacheDriver operations', () => {
  it('gets a parsed JSON value', async () => {
    const { driver, client } = construct();
    client.get.mockResolvedValue('{"a":1}');
    await expect(driver.get<{ a: number }>('k')).resolves.toEqual({ a: 1 });
  });

  it('returns null when the stored value is empty or absent', async () => {
    const { driver, client } = construct();
    client.get.mockResolvedValue('');
    await expect(driver.get('k')).resolves.toBeNull();
    client.get.mockResolvedValue(null);
    await expect(driver.get('k')).resolves.toBeNull();
  });

  it('returns null on get failure', async () => {
    const { driver, client } = construct();
    client.get.mockResolvedValue('not-json{');
    await expect(driver.get('k')).resolves.toBeNull();
  });

  it('sets with a TTL or without one', async () => {
    const { driver, client } = construct();
    await driver.set('k', { a: 1 }, 60);
    expect(client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 60);

    await driver.set('k', 'v');
    expect(client.set).toHaveBeenCalledWith('k', '"v"');

    await driver.set('k', 'v', 0);
    expect(client.set).toHaveBeenLastCalledWith('k', '"v"');
  });

  it('reports deletion based on the deleted count', async () => {
    const { driver, client } = construct();
    client.del.mockResolvedValue(1);
    await expect(driver.delete('k')).resolves.toBe(true);
    client.del.mockResolvedValue(0);
    await expect(driver.delete('k')).resolves.toBe(false);
  });

  it('scans and deletes keys by prefix across cursor pages', async () => {
    const { driver, client } = construct();
    client.del.mockResolvedValue(2);
    client.scan
      .mockResolvedValueOnce(['5', ['careercopilot:a', 'careercopilot:b']])
      .mockResolvedValueOnce(['0', ['careercopilot:c']]);

    const removed = await driver.deleteByPrefix('careercopilot:user');

    expect(client.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'careercopilot:user*',
      'COUNT',
      '100',
    );
    // 2 (page one) + 2 (page two)
    expect(removed).toBe(4);
    expect(client.del).toHaveBeenCalledTimes(2);
  });

  it('keeps a trailing star when one is supplied', async () => {
    const { driver, client } = construct();
    client.scan.mockResolvedValueOnce(['0', []]);
    await driver.deleteByPrefix('careercopilot:*');
    expect(client.scan).toHaveBeenCalledWith('0', 'MATCH', 'careercopilot:*', 'COUNT', '100');
  });

  it('deletes nothing when the scan yields no keys in a single page', async () => {
    const { driver, client } = construct();
    client.scan.mockResolvedValueOnce(['0', []]);
    await expect(driver.deleteByPrefix('empty')).resolves.toBe(0);
    expect(client.del).not.toHaveBeenCalled();
  });

  it('checks existence', async () => {
    const { driver, client } = construct();
    client.exists.mockResolvedValue(1);
    await expect(driver.exists('k')).resolves.toBe(true);
    client.exists.mockResolvedValue(0);
    await expect(driver.exists('k')).resolves.toBe(false);
  });

  it('increments and applies TTL only on the first increment when requested', async () => {
    const { driver, client } = construct();
    client.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(5);
    await expect(driver.increment('n', 100)).resolves.toBe(1);
    expect(client.expire).toHaveBeenCalledWith('n', 100);
    await expect(driver.increment('n', 100)).resolves.toBe(5);
    expect(client.expire).toHaveBeenCalledTimes(1);
  });

  it('increments without applying TTL', async () => {
    const { driver, client } = construct();
    client.incr.mockResolvedValue(1);
    await expect(driver.increment('n')).resolves.toBe(1);
    expect(client.expire).not.toHaveBeenCalled();
  });

  it('pings true only when PONG', async () => {
    const { driver, client } = construct();
    client.ping.mockResolvedValue('PONG');
    await expect(driver.ping()).resolves.toBe(true);
    client.ping.mockResolvedValue('PONGish');
    await expect(driver.ping()).resolves.toBe(false);
  });

  it('pings false and logs on failure', async () => {
    const { driver, client } = construct();
    client.ping.mockRejectedValue(new Error('down'));
    await expect(driver.ping()).resolves.toBe(false);
  });

  it('disconnects cleanly', async () => {
    const { driver, client } = construct();
    client.disconnect.mockResolvedValue(undefined);
    await expect(driver.disconnect()).resolves.toBeUndefined();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('rethrows on disconnect error', async () => {
    const { driver, client } = construct();
    client.disconnect.mockImplementation(() => {
      throw new Error('gone');
    });
    await expect(driver.disconnect()).rejects.toThrow('gone');
  });

  it('acquires a lock only when Redis returns OK', async () => {
    const { driver, client } = construct();
    client.set.mockResolvedValue('OK');
    await expect(driver.tryAcquireLock('l', 60)).resolves.toBe(true);
    client.set.mockResolvedValue('');
    await expect(driver.tryAcquireLock('l', 60)).resolves.toBe(false);
  });

  it('releases a lock by deleting the key', async () => {
    const { driver, client } = construct();
    client.del.mockResolvedValue(1);
    await expect(driver.releaseLock('l')).resolves.toBeUndefined();
    expect(client.del).toHaveBeenCalledWith('l');
  });
});

describe('CacheService with the redis driver', () => {
  it('selects RedisCacheDriver when CACHE_DRIVER=redis', async () => {
    const old = process.env.CACHE_DRIVER;
    process.env.CACHE_DRIVER = 'redis';

    const client = makeClient();
    Redis.mockImplementation(function () {
      return client as never;
    });
    const { CacheService } = await import('@/infrastructure/cache/cache.service.js');

    const service = new CacheService();
    expect(Redis).toHaveBeenCalled();

    // Delegates through to the redis client.
    client.get.mockResolvedValue('{"ok":true}');
    await expect(service.get('k')).resolves.toEqual({ ok: true });

    client.incr.mockResolvedValue(1);
    await expect(service.increment('n')).resolves.toBe(1);

    await service.disconnect();
    expect(client.disconnect).toHaveBeenCalled();

    process.env.CACHE_DRIVER = old ?? 'memory';
  });
});
