import { afterEach, describe, expect, it, vi } from 'vitest';

const workerStop = vi.fn();
const workerStart = vi.fn(async () => {});
class StubOutboxRelayWorker {
  start = workerStart;
  stop = workerStop;
}

const connectDb = vi.fn(async () => {});
const disconnectDb = vi.fn(async () => {});
const busConnect = vi.fn(async () => {});
const busClose = vi.fn(async () => {});
const prepareTopology = vi.fn(async () => {});
const info = vi.fn();
const errorLog = vi.fn();

vi.doMock('@/workers/outbox-relay.worker.js', () => ({
  OutboxRelayWorker: StubOutboxRelayWorker,
}));
vi.doMock('@/infrastructure/outbox/index.js', () => ({
  prepareOutboxRelayTopology: prepareTopology,
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

describe('run-outbox-relay', () => {
  afterEach(() => {
    vi.resetModules();
    workerStart.mockClear();
    workerStop.mockClear();
    connectDb.mockClear();
    disconnectDb.mockClear();
    busConnect.mockClear();
    busClose.mockClear();
    prepareTopology.mockClear();
    info.mockClear();
    errorLog.mockClear();
  });

  it('starts the relay and shuts down cleanly on signals', async () => {
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await import('@/workers/run-outbox-relay.js');
    await flush();

    expect(connectDb).toHaveBeenCalledTimes(1);
    expect(busConnect).toHaveBeenCalledTimes(1);
    expect(prepareTopology).toHaveBeenCalledTimes(1);
    expect(workerStart).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(undefined);

    process.emit('SIGTERM');
    await flush();
    process.emit('SIGINT');
    await flush();

    expect(workerStop).toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'Stopping outbox relay');
    expect(busClose).toHaveBeenCalledTimes(1);
    expect(disconnectDb).toHaveBeenCalledTimes(1);

    process.exitCode = previousExitCode;
  });

  it('sets exitCode when startup fails', async () => {
    connectDb.mockRejectedValueOnce(new Error('boom'));
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await import('@/workers/run-outbox-relay.js');
    await flush();

    expect(errorLog).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Outbox relay worker failed');
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
