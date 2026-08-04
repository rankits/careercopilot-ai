import {
  messageBus,
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
  QoSPresets,
} from '@/infrastructure/messaging/index.js';
import { logger } from '@/shared/logger/logger.js';
import {
  SubmissionProcessingService,
  type SubmissionJobPayload,
} from '@/modules/auto-apply/services/submission-processing.service.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { PrismaSubmissionAttemptRepository } from '@/modules/auto-apply/repositories/prisma-submission-attempt.repository.js';
import { PrismaChannelDetectionJobLookup } from '@/modules/auto-apply/repositories/prisma-channel-detection.lookup.js';
import { JobApplicationAdapterRegistry } from '@/modules/auto-apply/adapters/adapter-registry.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';
import { AutoApplyEventService } from '@/modules/auto-apply/services/audit-event.service.js';
import { PrismaAutoApplyEventRepository } from '@/modules/auto-apply/repositories/prisma-audit-event.repository.js';

const adapterRegistry = new JobApplicationAdapterRegistry();
adapterRegistry.register(new ExternalRedirectAdapter());
// EmailApplicationAdapter, PartnerAtsAdapter, and BrowserAssistedAdapter are
// intentionally not registered yet — see adapter-registry.ts.

const submissionProcessingService = new SubmissionProcessingService(
  new PrismaJobApplicationRepository(),
  new PrismaApplicationConsentRepository(),
  new PrismaSubmissionAttemptRepository(),
  new PrismaChannelDetectionJobLookup(),
  adapterRegistry,
  new AutoApplyEventService(new PrismaAutoApplyEventRepository()),
);

/**
 * Subscribes to the application-submit routing key and runs the
 * reliability sequence in `SubmissionProcessingService`. Unlike
 * `email.worker.ts`, this worker does need Postgres — locking,
 * revalidation, and attempt bookkeeping are inherently transactional
 * reads/writes, not a stateless side-effect dispatch.
 */
export const startApplicationSubmissionWorker = async (): Promise<void> => {
  await messageBus.subscribe<SubmissionJobPayload>(
    MessageQueues.APPLICATION_SUBMIT,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.APPLICATION_SUBMIT,
    async (message) => {
      await submissionProcessingService.processJob(message.payload);
    },
    QoSPresets.DEFAULT,
  );
  logger.info('Application submission worker started consuming');
};
