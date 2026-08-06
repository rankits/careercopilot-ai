import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateJitteredBackoff, sleep } from '@/modules/jobs/utils/backoff.js';

describe('calculateJitteredBackoff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses defaults when no options are provided', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // initialDelay=500, factor=2, attempt=1 => capped 500, floor(0) = 0
    expect(calculateJitteredBackoff(1)).toBe(0);
    // attempt=5 => 500*2^4=8000
    expect(calculateJitteredBackoff(5)).toBe(0);
    // attempt=8 => 500*2^7=64000 capped at 10000
    expect(calculateJitteredBackoff(8)).toBe(0);
  });

  it('caps exponential delay at maxDelayMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = calculateJitteredBackoff(10, {
      initialDelayMs: 100,
      maxDelayMs: 300,
      backoffFactor: 2,
    });
    // exponential = 100*2^9 = 51200, capped at 300 => floor(0.5*300)=150
    expect(result).toBe(150);
  });

  it('returns values within [0, cappedDelay)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const opts = { initialDelayMs: 1000, maxDelayMs: 4000, backoffFactor: 3 };
    const result = calculateJitteredBackoff(3, opts);
    // exponential = 1000*3^2=9000, capped 4000 => floor(0.999*4000)=3996
    expect(result).toBe(3996);
  });
});

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout') as any;
    const resolve = vi.fn();
    setTimeoutSpy.mockImplementation((_cb: () => void, _ms: number) => {
      return 1 as any;
    });
    const promise = sleep(5);
    // Grab the registered callback and invoke it to resolve the returned promise.
    const cb = setTimeoutSpy.mock.calls[0]?.[0] as () => void;
    cb();
    await promise;
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5);
  });
});
