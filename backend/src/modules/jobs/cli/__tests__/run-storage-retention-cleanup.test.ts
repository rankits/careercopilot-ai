import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  disconnect: vi.fn(async () => {}),
  log: vi.fn(),
  error: vi.fn(),
  run: vi.fn(async () => ({ expired: 5 })),
  env: { JOB_RETENTION_CLEANUP_BATCH_SIZE: 500 },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  connectDatabase: h.connect,
  disconnectDatabase: h.disconnect,
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: h.log, error: h.error, child: vi.fn(() => ({ info: h.log, error: h.error })) },
}));

vi.mock('@/shared/config/env.conf.js', () => ({ env: h.env }));

vi.mock('@/modules/jobs/services/storage-retention-cleanup.service.js', () => ({
  StorageRetentionCleanupService: class {
    run = h.run;
  },
}));

const load = async (args: string[]) => {
  process.argv = ['node', 'cli', ...args];
  vi.resetModules();
  await import('@/modules/jobs/cli/run-storage-retention-cleanup.js');
  await new Promise((resolve) => setImmediate(resolve));
};

beforeEach(() => {
  h.connect.mockClear();
  h.disconnect.mockClear();
  h.log.mockClear();
  h.error.mockClear();
  h.run.mockClear();
  h.run.mockResolvedValue({ expired: 5 });
});

afterEach(() => {
  vi.spyOn(console, 'log').mockRestore();
  vi.spyOn(console, 'error').mockRestore();
});

describe('run-storage-retention-cleanup CLI', () => {
  it('runs the service with parsed options and disconnects', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load(['--batch-size=50', '--after=job-1', '--dry-run']);

    expect(h.connect).toHaveBeenCalledTimes(1);
    expect(h.run).toHaveBeenCalledWith({ dryRun: true, batchSize: 50, afterJobId: 'job-1' });
    expect(h.disconnect).toHaveBeenCalledTimes(1);
    expect(h.log).toHaveBeenCalledWith({ expired: 5 }, expect.any(String));
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ expired: 5 }, null, 2));
  });

  it('defaults batch-size to the env value', async () => {
    await load([]);
    expect(h.run).toHaveBeenCalledWith({ dryRun: false, batchSize: 500, afterJobId: undefined });
  });

  it('prints usage and returns early on --h', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load(['--h']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('fails fast and sets exit code on an invalid batch-size', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const oldExitCode = process.exitCode;
    await load(['--batch-size=-3']);
    expect(h.error).toHaveBeenCalledWith({ err: expect.any(Error) }, expect.any(String));
    expect(errSpy).toHaveBeenCalledWith('batch-size must be a positive integer');
    expect(process.exitCode).toBe(1);
    process.exitCode = oldExitCode;
  });
});
