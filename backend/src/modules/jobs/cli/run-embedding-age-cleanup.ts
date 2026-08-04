import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { EmbeddingAgeCleanupService } from '@/modules/jobs/services/embedding-age-cleanup.service.js';

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
  npm run jobs:cleanup:embedding-age -- [options]

Options:
  --batch-size=<n>  Jobs per scan (default: ${env.JOB_EMBEDDING_CLEANUP_BATCH_SIZE})
  --after=<jobId>   Resume cursor after this job id
  --dry-run         Scan and report without deleting embeddings
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (parseFlag(args, 'help') || parseFlag(args, 'h')) {
    printUsage();
    return;
  }

  await connectDatabase();
  try {
    const service = new EmbeddingAgeCleanupService();
    const summary = await service.run({
      dryRun: parseFlag(args, 'dry-run'),
      batchSize:
        parsePositiveInteger(parseOption(args, 'batch-size'), 'batch-size') ??
        env.JOB_EMBEDDING_CLEANUP_BATCH_SIZE,
      afterJobId: parseOption(args, 'after'),
    });
    logger.info(summary, 'Embedding age cleanup finished');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await disconnectDatabase();
  }
};

main().catch((error: unknown) => {
  logger.error({ error }, 'Embedding age cleanup failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
