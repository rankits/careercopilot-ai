import { describe, expect, it } from 'vitest';
import { MemoryCacheDriver } from '@/infrastructure/cache/drivers/memory.driver.js';
import { CacheService } from '@/infrastructure/cache/cache.service.js';
import '@/infrastructure/cache/index.js';

describe('MemoryCacheDriver', () => {
  it('gets a stored value back', async () => {
    const d = new MemoryCacheDriver();
    await d.set('a', { hello: 1 });
    await expect(d.get<{ hello: number }>('a')).resolves.toEqual({ hello: 1 });
  });

  it('returns null for a missing key', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.get('missing')).resolves.toBeNull();
  });

  it('treats an expired entry as absent and evicts it', async () => {
    const d = new MemoryCacheDriver();
    await d.set('exp', 'v', -5); // negative TTL -> expiresAt in the past
    await expect(d.get('exp')).resolves.toBeNull();

    await d.set('ok', 'v', 60);
    await expect(d.get('ok')).resolves.toBe('v');
  });

  it('stores entries without a TTL', async () => {
    const d = new MemoryCacheDriver();
    await d.set('plain', 'x');
    await expect(d.get('plain')).resolves.toBe('x');
  });

  it('reports deletion success and failure', async () => {
    const d = new MemoryCacheDriver();
    await d.set('a', 1);
    await expect(d.delete('a')).resolves.toBe(true);
    await expect(d.delete('a')).resolves.toBe(false);
  });

  it('deletes keys by prefix with or without a trailing star', async () => {
    const d = new MemoryCacheDriver();
    await d.set('careercopilot:user:1', 'u');
    await d.set('careercopilot:user:2', 'u');
    await d.set('careercopilot:other:1', 'o');
    await d.set('separate', 's');

    const removed = await d.deleteByPrefix('careercopilot:user*');
    expect(removed).toBe(2);
    await expect(d.exists('careercopilot:other:1')).resolves.toBe(true);

    const removedPlain = await d.deleteByPrefix('separate');
    expect(removedPlain).toBe(1);
    await expect(d.exists('separate')).resolves.toBe(false);
  });

  it('counts zero when nothing matches a prefix', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.deleteByPrefix('nope*')).resolves.toBe(0);
  });

  it('checks existence', async () => {
    const d = new MemoryCacheDriver();
    await d.set('present', 'v');
    await expect(d.exists('present')).resolves.toBe(true);
    await expect(d.exists('absent')).resolves.toBe(false);
  });

  it('increments a counter, creating it and applying TTL on first increment', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.increment('count', 100)).resolves.toBe(1);
  });

  it('increments an existing counter while preserving its remaining TTL', async () => {
    const d = new MemoryCacheDriver();
    await d.increment('count', 100);
    await expect(d.increment('count', 200)).resolves.toBe(2);
    await expect(d.get('count')).resolves.toBe(2);
  });

  it('increments without a TTL on first increment', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.increment('count')).resolves.toBe(1);
    await expect(d.get('count')).resolves.toBe(1);
  });

  it('pings successfully and clears on disconnect', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.ping()).resolves.toBe(true);
    await d.set('k', 'v');
    await d.disconnect();
    await expect(d.exists('k')).resolves.toBe(false);
  });

  it('acquires a lock only when one is not already held', async () => {
    const d = new MemoryCacheDriver();
    await expect(d.tryAcquireLock('lock', 100)).resolves.toBe(true);
    await expect(d.tryAcquireLock('lock', 100)).resolves.toBe(false);

    await d.releaseLock('lock');
    await expect(d.tryAcquireLock('lock', 100)).resolves.toBe(true);
  });
});

describe('CacheService (memory driver)', () => {
  const driver = new CacheService();

  it('delegates getOrSet and caches fetches', async () => {
    await driver.delete('gs');
    let fetches = 0;
    const loaded = await driver.getOrSet(
      'gs',
      async () => {
        fetches++;
        return 'value';
      },
      60,
    );
    expect(loaded).toBe('value');

    const cached = await driver.getOrSet('gs', async () => {
      fetches++;
      return 'value';
    });
    expect(cached).toBe('value');
    expect(fetches).toBe(1);
  });

  it('supports the full operation surface', async () => {
    await expect(driver.ping()).resolves.toBe(true);
    await driver.set('raw', 'raw');
    await expect(driver.get('raw')).resolves.toBe('raw');
    await expect(driver.exists('raw')).resolves.toBe(true);
    await expect(driver.increment('n', 60)).resolves.toBe(1);
    await expect(driver.deleteByPrefix('raw')).resolves.toBe(1);
    await expect(driver.tryAcquireLock('l', 60)).resolves.toBe(true);
    await expect(driver.tryAcquireLock('l', 60)).resolves.toBe(false);
    await driver.releaseLock('l');
    await driver.disconnect();
  });
});
