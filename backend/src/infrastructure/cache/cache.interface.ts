export interface ICacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteByPrefix(prefix: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export interface ICacheService extends ICacheDriver {
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
