import { ICacheDriver, ICacheService } from "@/infrastructure/cache/cache.interface.js";
import { MemoryCacheDriver } from "@/infrastructure/cache/drivers/memory.driver.js";
import { RedisCacheDriver } from "@/infrastructure/cache/drivers/redis.driver.js";

export class CacheService implements ICacheService {
  private driver: ICacheDriver;

  constructor() {
    const driverType = (process.env.CACHE_DRIVER || "memory").toLowerCase();
    if (driverType === "redis") {
      this.driver = new RedisCacheDriver();
    } else {
      this.driver = new MemoryCacheDriver();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.driver.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.driver.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return this.driver.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    return this.driver.deleteByPrefix(prefix);
  }

  async exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  async ping(): Promise<boolean> {
    return this.driver.ping();
  }

  async disconnect(): Promise<void> {
    return this.driver.disconnect();
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const cacheService = new CacheService();
