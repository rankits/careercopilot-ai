import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  disconnect: vi.fn(async () => {}),
  log: vi.fn(),
  error: vi.fn(),
  run: vi.fn(async () => ({ deleted: 3 })),
  env: { JOB_EMBEDDING_CLEANUP_BATCH_SIZE: 500 },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  connectDatabase: h.connect,
  disconnectDatabase: h.disconnect,
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: h.log, error: h.error, child: vi.fn(() => ({ info: h.log, error: h.error })) },
}));

vi.mock('@/shared/config/env.conf.js', () => ({ env: h.env }));

vi.mock('@/modules/jobs/services/embedding-age-cleanup.service.js', () => ({
  EmbeddingAgeCleanupService: class {
    run = h.run;
  },
}));

const load = async (args: string[]) => {
  process.argv = ['node', 'cli', ...args];
  vi.resetModules();
  await import('@/modules/jobs/cli/run-embedding-age-cleanup.js');
  // main() is fire-and-forget at module scope; let its awaited mock calls
  // (connect -> run -> log -> disconnect) drain before asserting.
  await new Promise((resolve) => setImmediate(resolve));
};

beforeEach(() => {
  h.connect.mockClear();
  h.disconnect.mockClear();
  h.log.mockClear();
  h.error.mockClear();
  h.run.mockClear();
  h.run.mockResolvedValue({ deleted: 3 });
});

afterEach(() => {
  vi.spyOn(console, 'log').mockRestore();
  vi.spyOn(console, 'error').mockRestore();
});

describe('run-embedding-age-cleanup CLI', () => {
  it('runs the service with parsed options and disconnects', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load(['--batch-size=100', '--after=job-9', '--dry-run']);

    expect(h.connect).toHaveBeenCalledTimes(1);
    expect(h.run).toHaveBeenCalledWith({
      dryRun: true,
      batchSize: 100,
      afterJobId: 'job-9',
    });
    expect(h.disconnect).toHaveBeenCalledTimes(1);
    expect(h.log).toHaveBeenCalledWith({ deleted: 3 }, expect.any(String));
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ deleted: 3 }, null, 2));
  });

  it('defaults batch-size to the env value and trims empty options', async () => {
    await load(['--after=']);
    expect(h.run).toHaveBeenCalledWith({
      dryRun: false,
      batchSize: 500,
      afterJobId: undefined,
    });
  });

  it('prints usage and returns early on --help', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load(['--help']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.run).not.toHaveBeenCalled();
  });

  it('fails fast and sets exit code when batch-size is not a positive integer', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const oldExitCode = process.exitCode;
    await load(['--batch-size=0']);
    expect(h.error).toHaveBeenCalledWith({ err: expect.any(Error) }, expect.any(String));
    expect(errSpy).toHaveBeenCalledWith('batch-size must be a positive integer');
    expect(process.exitCode).toBe(1);
    process.exitCode = oldExitCode;
  });
});
