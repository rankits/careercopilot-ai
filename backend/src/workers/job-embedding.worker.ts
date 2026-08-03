import { createEmbeddingProvider } from '@/modules/ai-embeddings/index.js';
import { embeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';
import { logJobEmbeddingIndexOutcome } from '@/modules/job-embeddings/observability/job-embedding-coverage.js';
import { PrismaJobEmbeddingRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js';
import { JobEmbeddingBatchCoordinator } from '@/modules/job-embeddings/services/job-embedding-batch-coordinator.js';
import { JobEmbeddingIndexerService } from '@/modules/job-embeddings/services/job-embedding-indexer.service.js';
import { parseJobSemanticContentChangedEvent } from '@/modules/job-embeddings/validators/job-embedding-event.validator.js';
import {
  messageBus,
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import { logger } from '@/shared/logger/logger.js';

export const startJobEmbeddingWorker = async (): Promise<void> => {
  const provider = createEmbeddingProvider();
  const indexer = new JobEmbeddingIndexerService(
    provider,
    new PrismaJobEmbeddingRepository(),
    undefined,
    undefined,
    undefined,
    undefined,
    ({ jobId, eventId, outcome }) =>
      logJobEmbeddingIndexOutcome(logger, { jobId, eventId, outcome }),
  );
  const batcher = new JobEmbeddingBatchCoordinator(indexer, embeddingConfig.batchSize);

  await messageBus.subscribe(
    MessageQueues.JOB_EMBEDDING_REQUESTS,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
    async (message) => {
      const event = parseJobSemanticContentChangedEvent(message.payload);
      const outcome = await batcher.enqueue(message.id, event);
      logger.info(
        {
          eventId: message.id,
          jobId: event.jobId,
          jobVersion: event.jobVersion,
          provider: provider.provider,
          model: provider.model,
          outcome,
        },
        'Job embedding event processed',
      );
    },
    {
      dlq: true,
      maxRetries: 5,
      retryDelayMs: 10_000,
      // Prefetch enough to fill a provider batch; each message still acks independently.
      prefetch: embeddingConfig.batchSize,
      quorum: false,
    },
  );
  logger.info(
    {
      provider: provider.provider,
      model: provider.model,
      dimensions: provider.dimensions,
      batchSize: embeddingConfig.batchSize,
      batchMaxCharacters: embeddingConfig.batchMaxCharacters,
    },
    'Job embedding worker started',
  );
};
