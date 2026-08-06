import { afterEach, describe, expect, it, vi } from 'vitest';

const startJobEmbeddingMock = vi.fn();
const connectDb = vi.fn(async () => {});
const disconnectDb = vi.fn(async () => {});
const busConnect = vi.fn(async () => {});
const busClose = vi.fn(async () => {});
const info = vi.fn();
const errorLog = vi.fn();

vi.doMock('@/workers/job-embedding.worker.js', () => ({
  startJobEmbeddingWorker: (...args: never[]) => startJobEmbeddingMock(...args),
}));
vi.doMock('@/shared/config/db.conf.js', () => ({
  connectDatabase: connectDb,
  disconnectDatabase: disconnectDb,
}));
vi.doMock('@/infrastructure/messaging/index.js', () => ({
  messageBus: { connect: busConnect, close: busClose },
}));
vi.doMock('@/shared/logger/logger.js', () => ({
  logger: { info, error: errorLog, warn: vi.fn(), debug: vi.fn() },
}));

describe('run-job-embedding-worker', () => {
  afterEach(() => {
    vi.resetModules();
    startJobEmbeddingMock.mockReset();
    connectDb.mockClear();
    disconnectDb.mockClear();
    busConnect.mockClear();
    busClose.mockClear();
    info.mockClear();
    errorLog.mockClear();
  });

  it('starts the worker and shuts down cleanly on signals', async () => {
    startJobEmbeddingMock.mockResolvedValueOnce(undefined);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await import('@/workers/run-job-embedding-worker.js');
    await flush();

    expect(connectDb).toHaveBeenCalledTimes(1);
    expect(busConnect).toHaveBeenCalledTimes(1);
    expect(startJobEmbeddingMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(undefined);

    // Trigger SIGTERM then SIGINT (the second hit hits the re-entrancy guard).
    process.emit('SIGTERM');
    await flush();
    process.emit('SIGINT');
    await flush();

    expect(info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'Stopping job embedding worker');
    expect(busClose).toHaveBeenCalledTimes(1);
    expect(disconnectDb).toHaveBeenCalledTimes(1);

    process.exitCode = previousExitCode;
  });

  it('sets exitCode when startup fails', async () => {
    startJobEmbeddingMock.mockRejectedValueOnce(new Error('boom'));
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await import('@/workers/run-job-embedding-worker.js');
    await flush();

    expect(errorLog).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Job embedding worker failed to start',
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
