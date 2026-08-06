import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  disconnect: vi.fn(async () => {}),
  log: vi.fn(),
  error: vi.fn(),
  run: vi.fn(async () => ({ indexed: 2, failed: 0 })),
  env: {
    // resolveBackfillOptions reads these; we keep the whole service module
    // mocked so only the CLI file is under test here. These values are
    // referenced by the mocked pass-through, so they never hit the real fn.
  },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  connectDatabase: h.connect,
  disconnectDatabase: h.disconnect,
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: h.log, error: h.error, child: vi.fn(() => ({ info: h.log, error: h.error })) },
}));

vi.mock('@/modules/job-embeddings/config/job-embedding.config.js', () => ({
  jobEmbeddingConfig: { backfillBatchSize: 100 },
}));

vi.mock(
  '@/modules/job-embeddings/repositories/prisma-job-embedding-backfill.repository.js',
  () => ({
    PrismaJobEmbeddingBackfillRepository: class {},
  }),
);

vi.mock('@/modules/job-embeddings/services/job-embedding-backfill.service.js', () => ({
  resolveBackfillOptions: (opts: unknown) => opts,
  JobEmbeddingBackfillService: class {
    run = h.run;
  },
}));

const load = async (args: string[]) => {
  process.argv = ['node', 'cli', ...args];
  vi.resetModules();
  await import('@/modules/job-embeddings/cli/run-job-embedding-backfill.js');
  await new Promise((resolve) => setImmediate(resolve));
};

beforeEach(() => {
  h.connect.mockClear();
  h.disconnect.mockClear();
  h.log.mockClear();
  h.error.mockClear();
  h.run.mockClear();
  h.run.mockResolvedValue({ failed: 0 });
});

afterEach(() => {
  vi.spyOn(console, 'log').mockRestore();
  vi.spyOn(console, 'error').mockRestore();
});

describe('run-job-embedding-backfill CLI', () => {
  it('parses a full set of options into the service', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load([
      '--provider=p1',
      '--model=m1',
      '--batch-size=10',
      '--after=x',
      '--max-jobs=5',
      '--force',
      '--dry-run',
    ]);

    expect(h.connect).toHaveBeenCalledTimes(1);
    expect(h.run).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'p1',
        model: 'm1',
        batchSize: 10,
        afterJobId: 'x',
        maxJobs: 5,
        force: true,
        dryRun: true,
      }),
    );
    expect(h.disconnect).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ failed: 0 }, null, 2));
  });

  it('defaults batch-size from jobEmbeddingConfig with no failures', async () => {
    await load([]);
    expect(h.run).toHaveBeenCalledWith(
      expect.objectContaining({ batchSize: 100, force: false, dryRun: false }),
    );
    expect(process.exitCode).not.toBe(1);
  });

  it('prints usage and returns early on --help', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await load(['--help']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('sets exit code when the summary reports failures', async () => {
    h.run.mockResolvedValue({ failed: 3 });
    const oldExitCode = process.exitCode;
    await load(['--force']);
    expect(h.log).toHaveBeenCalledWith({ failed: 3 }, expect.any(String));
    expect(process.exitCode).toBe(1);
    process.exitCode = oldExitCode;
  });

  it('fails fast on an invalid max-jobs value', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const oldExitCode = process.exitCode;
    await load(['--max-jobs=0']);
    expect(h.error).toHaveBeenCalledWith({ err: expect.any(Error) }, expect.any(String));
    expect(errSpy).toHaveBeenCalledWith('max-jobs must be a positive integer');
    expect(process.exitCode).toBe(1);
    process.exitCode = oldExitCode;
  });
});
