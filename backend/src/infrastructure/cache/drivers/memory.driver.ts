import { ICacheDriver } from "../cache.interface.js";

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

export class MemoryCacheDriver implements ICacheDriver {
  private store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const normalizedPrefix = prefix.endsWith("*") ? prefix.slice(0, -1) : prefix;
    let count = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(normalizedPrefix)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get<number>(key);
    const next = (current ?? 0) + 1;

    // TTL is only (re)applied on the increment that creates the key, to
    // match a fixed-window counter's semantics.
    if (current === null) {
      await this.set(key, next, ttlSeconds);
    } else {
      const entry = this.store.get(key);
      this.store.set(key, { value: next, expiresAt: entry?.expiresAt ?? null });
    }

    return next;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }
}
