export interface ICacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteByPrefix(prefix: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  /**
   * Atomically increments `key` (creating it at 1 if absent) and, only on
   * the increment that creates the key, applies `ttlSeconds` - a
   * fixed-window counter used for rate limiting / cooldowns.
   */
  increment(key: string, ttlSeconds?: number): Promise<number>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export interface ICacheService extends ICacheDriver {
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
