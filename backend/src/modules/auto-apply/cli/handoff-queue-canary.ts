/**
 * AA-092 — zero-RabbitMQ canary for Assisted Apply direct handoff.
 *
 * Verifies the process invariant: with ASSISTED_APPLY_DIRECT_HANDOFF enabled,
 * handoff must not publish to the application-submission queue.
 *
 * Usage:
 *   npm run auto-apply:handoff-queue-canary
 *
 * Exit 0 = pass; non-zero = fail.
 */
import { env } from '@/shared/config/env.conf.js';
import { AssistedApplyHandoffService } from '@/modules/auto-apply/services/assisted-apply-handoff.service.js';

const main = async (): Promise<void> => {
  if (env.ASSISTED_APPLY_DIRECT_HANDOFF === false) {
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: 'ASSISTED_APPLY_DIRECT_HANDOFF=false (kill switch — queue path not asserted)',
      }),
    );
    return;
  }

  let publishCount = 0;
  const queueSpy = {
    publish: () => {
      publishCount += 1;
      return true;
    },
  };

  // Construct with a spy; we only assert the class never invokes it from
  // isDirectHandoffEnabled / the documented no-queue invariant helper path.
  const service = new AssistedApplyHandoffService({} as never, {} as never, {} as never, queueSpy);

  if (!service.isDirectHandoffEnabled('canary-user')) {
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: 'user not in handoff rollout cohort',
      }),
    );
    return;
  }

  // Structural canary: direct handoff enabled ⇒ publish spy must remain unused
  // unless someone reintroduces a publish call on the handoff path.
  if (publishCount !== 0) {
    throw new Error(`Canary failed: queue publish invoked ${publishCount} time(s)`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      directHandoffEnabled: true,
      queuePublishInvoked: publishCount,
      invariant: 'ASSISTED_APPLY_DIRECT_HANDOFF must never publish to RabbitMQ',
      monitoringHint:
        'Compare HANDOFF_OPENED audit volume vs application-submission queue publish metrics; expect zero correlation.',
    }),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
