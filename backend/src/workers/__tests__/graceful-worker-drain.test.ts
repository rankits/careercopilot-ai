import { describe, expect, it, vi } from 'vitest';
import { drainWorker, type WorkerDrainDeps } from '@/workers/graceful-worker-drain.js';

function createDeps(overrides: Partial<WorkerDrainDeps> = {}): WorkerDrainDeps {
  return {
    cancelConsumers: vi.fn().mockResolvedValue(undefined),
    waitForInFlight: vi.fn().mockResolvedValue('idle'),
    closeMessageBus: vi.fn().mockResolvedValue(undefined),
    disconnectDatabase: vi.fn().mockResolvedValue(undefined),
    drainTimeoutMs: 30_000,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    exit: vi.fn(),
    ...overrides,
  };
}

describe('drainWorker (AA-008)', () => {
  it('idle path: cancel → wait idle → close → disconnect → exit 0', async () => {
    const deps = createDeps();
    const order: string[] = [];
    deps.cancelConsumers = vi.fn(async () => {
      order.push('cancel');
    });
    deps.waitForInFlight = vi.fn(async () => {
      order.push('wait');
      return 'idle';
    });
    deps.closeMessageBus = vi.fn(async () => {
      order.push('close');
    });
    deps.disconnectDatabase = vi.fn(async () => {
      order.push('db');
    });
    deps.exit = vi.fn((code) => {
      order.push(`exit:${code}`);
    });

    await drainWorker('SIGTERM', deps);

    expect(order).toEqual(['cancel', 'wait', 'close', 'db', 'exit:0']);
    expect(deps.waitForInFlight).toHaveBeenCalledWith(30_000);
    expect(deps.log.warn).not.toHaveBeenCalled();
  });

  it('in-flight completes within drain window before exit', async () => {
    const deps = createDeps({
      waitForInFlight: vi.fn().mockResolvedValue('idle'),
    });

    await drainWorker('SIGINT', deps);

    expect(deps.cancelConsumers).toHaveBeenCalledOnce();
    expect(deps.closeMessageBus).toHaveBeenCalledOnce();
    expect(deps.disconnectDatabase).toHaveBeenCalledOnce();
    expect(deps.exit).toHaveBeenCalledWith(0);
    expect(deps.log.info).toHaveBeenCalledWith(
      { signal: 'SIGINT' },
      'Worker in-flight work drained',
    );
  });

  it('drain timeout logs a warning then still closes and exits 0', async () => {
    const deps = createDeps({
      waitForInFlight: vi.fn().mockResolvedValue('timeout'),
      drainTimeoutMs: 50,
    });

    await drainWorker('SIGTERM', deps);

    expect(deps.log.warn).toHaveBeenCalledWith(
      { signal: 'SIGTERM', drainTimeoutMs: 50 },
      expect.stringContaining('timed out'),
    );
    expect(deps.closeMessageBus).toHaveBeenCalledOnce();
    expect(deps.disconnectDatabase).toHaveBeenCalledOnce();
    expect(deps.exit).toHaveBeenCalledWith(0);
  });

  it('does not accept new work after cancel (cancel runs before wait)', async () => {
    const deps = createDeps();
    const order: string[] = [];
    deps.cancelConsumers = vi.fn(async () => {
      order.push('cancel');
    });
    deps.waitForInFlight = vi.fn(async () => {
      order.push('wait');
      return 'idle';
    });

    await drainWorker('SIGTERM', deps);

    expect(order.indexOf('cancel')).toBeLessThan(order.indexOf('wait'));
  });
});
