import { Redis, Cluster, RedisOptions, ClusterNode } from 'ioredis';
import { ICacheDriver } from '@/infrastructure/cache/cache.interface.js';
import { logger } from '@/shared/logger/logger.js';

type RedisClientType = Redis | Cluster;

export class RedisCacheDriver implements ICacheDriver {
  private client: RedisClientType;
  private readonly log = logger.child({ component: 'redis' });

  constructor() {
    this.client = this.createClient();
    this.attachConnectionListeners();
  }

  private createClient(): RedisClientType {
    const mode = (process.env.REDIS_MODE || 'standalone').toLowerCase();
    const password = process.env.REDIS_PASSWORD || undefined;
    const keyPrefix = process.env.REDIS_KEY_PREFIX || '';

    const commonOptions: RedisOptions = {
      password,
      keyPrefix,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
    };

    if (mode === 'cluster') {
      const nodesEnv = process.env.REDIS_CLUSTER_NODES || '127.0.0.1:6379';
      const clusterNodes: ClusterNode[] = nodesEnv.split(',').map((node) => {
        const [host, port] = node.trim().split(':');
        return { host, port: Number(port) || 6379 };
      });

      this.log.info({ mode, nodes: nodesEnv }, 'Connecting to Redis cluster');
      return new Cluster(clusterNodes, {
        redisOptions: commonOptions,
      });
    }

    if (mode === 'sentinel') {
      const sentinelsEnv = process.env.REDIS_SENTINELS || '127.0.0.1:26379';
      const sentinels = sentinelsEnv.split(',').map((s) => {
        const [host, port] = s.trim().split(':');
        return { host, port: Number(port) || 26379 };
      });
      const masterName = process.env.REDIS_SENTINEL_MASTER || 'mymaster';

      this.log.info(
        { mode, sentinels: sentinelsEnv, masterName },
        'Connecting to Redis via Sentinel',
      );
      return new Redis({
        ...commonOptions,
        sentinels,
        name: masterName,
      });
    }

    // Default: Standalone mode
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT) || 6379;

    this.log.info({ mode: 'standalone', host, port }, 'Connecting to Redis');
    return new Redis({
      ...commonOptions,
      host,
      port,
    });
  }

  private attachConnectionListeners(): void {
    this.client.on('connect', () => {
      this.log.info('Redis TCP connection established');
    });

    this.client.on('ready', () => {
      this.log.info('Redis connection ready');
    });

    this.client.on('error', (error: Error) => {
      this.log.error({ err: error }, 'Redis connection error');
    });

    this.client.on('close', () => {
      this.log.warn('Redis connection closed');
    });

    this.client.on('end', () => {
      this.log.warn('Redis connection ended');
    });

    this.client.on('reconnecting', (delay: number) => {
      this.log.warn({ delayMs: delay }, 'Redis reconnecting');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.log.error({ err: error, key }, 'Redis get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    const deleted = await this.client.del(key);
    return deleted > 0;
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const matchPattern = prefix.endsWith('*') ? prefix : `${prefix}*`;
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        matchPattern,
        'COUNT',
        '100',
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        const removed = await this.client.del(...keys);
        deletedCount += removed;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.client.exists(key);
    return res > 0;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1 && ttlSeconds && ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch (error) {
      this.log.error({ err: error }, 'Redis ping failed');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.log.info('Disconnecting Redis client');
    try {
      this.client.disconnect();
      this.log.info('Redis client disconnected');
    } catch (error) {
      this.log.error({ err: error }, 'Redis disconnect failed');
      throw error;
    }
  }

  async tryAcquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.delete(key);
  }
}
