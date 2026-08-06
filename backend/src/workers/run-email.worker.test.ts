import { afterEach, describe, expect, it, vi } from 'vitest';

const startMock = vi.fn();
const errorLog = vi.fn();

vi.doMock('@/workers/email.worker.js', async () => ({
  startEmailWorker: (...args: never[]) => startMock(...args),
}));
vi.doMock('@/shared/logger/logger.js', () => ({
  logger: { error: errorLog, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('run-email-worker', () => {
  afterEach(() => {
    vi.resetModules();
    startMock.mockReset();
    errorLog.mockClear();
  });

  it('starts the email worker successfully', async () => {
    let exitCalled = false;
    startMock.mockResolvedValueOnce(undefined);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      exitCalled = true;
      return undefined as never;
    });

    await import('@/workers/run-email-worker.js');
    await flush();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(exitCalled).toBe(false);
    exitSpy.mockRestore();
  });

  it('logs and exits when worker startup fails', async () => {
    startMock.mockRejectedValueOnce(new Error('start failed'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });

    await import('@/workers/run-email-worker.js');
    await flush();

    expect(errorLog).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Failed to start email worker',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
