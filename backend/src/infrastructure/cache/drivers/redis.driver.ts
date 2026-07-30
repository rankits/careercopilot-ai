import { Redis, Cluster, RedisOptions, ClusterNode } from 'ioredis';
import { ICacheDriver } from '@/infrastructure/cache/cache.interface.js';

type RedisClientType = Redis | Cluster;

export class RedisCacheDriver implements ICacheDriver {
  private client: RedisClientType;

  constructor() {
    this.client = this.createClient();
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

      return new Redis({
        ...commonOptions,
        sentinels,
        name: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
      });
    }

    // Default: Standalone mode
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT) || 6379;

    return new Redis({
      ...commonOptions,
      host,
      port,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
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
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client.disconnect();
  }
}
