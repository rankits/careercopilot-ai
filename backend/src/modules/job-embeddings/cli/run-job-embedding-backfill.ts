import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { jobEmbeddingConfig } from '@/modules/job-embeddings/config/job-embedding.config.js';
import { PrismaJobEmbeddingBackfillRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding-backfill.repository.js';
import {
  JobEmbeddingBackfillService,
  resolveBackfillOptions,
} from '@/modules/job-embeddings/services/job-embedding-backfill.service.js';

const parseFlag = (args: string[], name: string): boolean => args.includes(`--${name}`);

const parseOption = (args: string[], name: string): string | undefined => {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  if (!match) return undefined;
  const value = match.slice(prefix.length).trim();
  return value || undefined;
};

const parsePositiveInteger = (value: string | undefined, field: string): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
};

const printUsage = (): void => {
  console.log(`Usage:
  npm run job-embeddings:backfill -- [options]

Options:
  --provider=<name>     Embedding provider (default: AI_EMBEDDING_PROVIDER)
  --model=<name>        Embedding model (default: AI_EMBEDDING_MODEL)
  --batch-size=<n>      Active jobs per scan (default: ${jobEmbeddingConfig.backfillBatchSize})
  --after=<jobId>       Resume cursor after this job id
  --max-jobs=<n>        Stop after scanning this many jobs
  --force               Re-enqueue jobs that already have a current embedding
  --dry-run             Scan and report without writing outbox events
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (parseFlag(args, 'help') || parseFlag(args, 'h')) {
    printUsage();
    return;
  }

  const options = resolveBackfillOptions({
    provider: parseOption(args, 'provider'),
    model: parseOption(args, 'model'),
    batchSize:
      parsePositiveInteger(parseOption(args, 'batch-size'), 'batch-size') ??
      jobEmbeddingConfig.backfillBatchSize,
    afterJobId: parseOption(args, 'after'),
    maxJobs: parsePositiveInteger(parseOption(args, 'max-jobs'), 'max-jobs'),
    force: parseFlag(args, 'force'),
    dryRun: parseFlag(args, 'dry-run'),
  });

  await connectDatabase();
  try {
    const service = new JobEmbeddingBackfillService(new PrismaJobEmbeddingBackfillRepository());
    const summary = await service.run(options);
    logger.info(summary, 'Job embedding backfill finished');
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Job embedding backfill failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
