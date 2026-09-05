/**
 * AA-093 — dry-run / execute repair for legacy APPROVED|QUEUED → WITHDRAWN.
 *
 * Usage:
 *   npm run auto-apply:repair-legacy-status -- --dry-run
 *   npm run auto-apply:repair-legacy-status -- --execute --confirm=REPAIR_LEGACY_STATUS
 *
 * Dry-run is the default. Execute requires an explicit confirm token.
 */
import { JobApplicationStatus } from '@prisma/client';
import { connectDatabase, disconnectDatabase, prisma } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import {
  LEGACY_REPAIR_SOURCE_STATUSES,
  LEGACY_REPAIR_TARGET,
  planLegacyStatusRepairs,
} from '@/modules/auto-apply/utils/legacy-status-repair.util.js';
import type { JobApplicationStatusValue } from '@/modules/auto-apply/types/job-application.types.js';

const CONFIRM_TOKEN = 'REPAIR_LEGACY_STATUS';

const parseFlag = (args: string[], name: string): boolean => args.includes(`--${name}`);
const parseOption = (args: string[], name: string): string | undefined => {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  if (!match) return undefined;
  return match.slice(prefix.length).trim() || undefined;
};

const printUsage = (): void => {
  console.log(`Usage:
  npm run auto-apply:repair-legacy-status -- [--dry-run | --execute --confirm=${CONFIRM_TOKEN}]

Options:
  --dry-run   Report rows that would be repaired (default)
  --execute   Apply APPROVED|QUEUED → WITHDRAWN via CAS updates
  --confirm=  Must equal ${CONFIRM_TOKEN} when using --execute
  --limit=N   Max rows to scan (default 500)
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (parseFlag(args, 'help') || parseFlag(args, 'h')) {
    printUsage();
    return;
  }

  const execute = parseFlag(args, 'execute');
  const dryRun = !execute || parseFlag(args, 'dry-run');
  const confirm = parseOption(args, 'confirm');
  const limit = Number(parseOption(args, 'limit') ?? '500');

  if (execute) {
    if (confirm !== CONFIRM_TOKEN) {
      throw new Error(
        `Refusing execute without --confirm=${CONFIRM_TOKEN} (dry-run first, then re-run with confirm)`,
      );
    }
  }

  await connectDatabase();

  const records = await prisma.jobApplication.findMany({
    where: {
      status: {
        in: LEGACY_REPAIR_SOURCE_STATUSES as JobApplicationStatus[],
      },
    },
    take: Number.isFinite(limit) && limit > 0 ? limit : 500,
    orderBy: { updatedAt: 'asc' },
    select: { id: true, userId: true, status: true },
  });

  const plan = planLegacyStatusRepairs(
    records.map((r) => ({
      id: r.id,
      userId: r.userId,
      status: r.status as JobApplicationStatusValue,
    })),
  );
  const eligible = plan.filter((r) => r.eligible);

  console.log(
    JSON.stringify(
      {
        mode: execute && !dryRun ? 'execute' : 'dry-run',
        scanned: plan.length,
        eligible: eligible.length,
        skipped: plan.length - eligible.length,
        rows: plan,
      },
      null,
      2,
    ),
  );

  if (!execute || dryRun) {
    logger.info({ eligible: eligible.length }, 'AA-093 legacy status repair dry-run complete');
    return;
  }

  let repaired = 0;
  let skipped = 0;
  for (const row of eligible) {
    try {
      const updated = await prisma.jobApplication.updateMany({
        where: {
          id: row.id,
          userId: row.userId,
          status: row.previousStatus as JobApplicationStatus,
        },
        data: {
          status: LEGACY_REPAIR_TARGET as JobApplicationStatus,
          abandonReason: 'LEGACY_STATUS_REPAIR',
          abandonNote: null,
        },
      });
      if (updated.count === 0) {
        skipped += 1;
        continue;
      }
      repaired += 1;
      void autoApplyEventService.record({
        userId: row.userId,
        jobApplicationId: row.id,
        eventType: 'LEGACY_STATUS_REPAIRED',
        metadata: {
          previousStatus: row.previousStatus,
          newStatus: LEGACY_REPAIR_TARGET,
          actorType: 'ADMIN',
          kind: 'legacy_status_repair',
        },
      });
    } catch (error) {
      logger.error({ err: error, id: row.id }, 'AA-093 repair failed for row');
      skipped += 1;
    }
  }

  console.log(JSON.stringify({ repaired, skipped, idempotentSkips: skipped }, null, 2));
  logger.info({ repaired, skipped }, 'AA-093 legacy status repair execute complete');
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => undefined);
  });
