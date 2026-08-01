import { createEmbeddingProvider } from '@/modules/ai-embeddings/index.js';
import { PrismaJobEmbeddingRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js';
import { JobEmbeddingIndexerService } from '@/modules/job-embeddings/services/job-embedding-indexer.service.js';
import { parseJobSemanticContentChangedEvent } from '@/modules/job-embeddings/validators/job-embedding-event.validator.js';
import {
  messageBus,
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
  QoSPresets,
} from '@/infrastructure/messaging/index.js';
import { logger } from '@/shared/logger/logger.js';

export const startJobEmbeddingWorker = async (): Promise<void> => {
  const provider = createEmbeddingProvider();
  const indexer = new JobEmbeddingIndexerService(provider, new PrismaJobEmbeddingRepository());
  await messageBus.subscribe(
    MessageQueues.JOB_EMBEDDING_REQUESTS,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
    async (message) => {
      const event = parseJobSemanticContentChangedEvent(message.payload);
      const outcome = await indexer.process(message.id, event);
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
    QoSPresets.RELIABLE_DLQ,
  );
  logger.info(
    { provider: provider.provider, model: provider.model, dimensions: provider.dimensions },
    'Job embedding worker started',
  );
};
