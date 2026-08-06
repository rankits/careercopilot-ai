import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const enqueue = vi.fn(async () => 'ANCHOR');
  class TestIndexer {}
  class TestRepository {}
  class TestBatcher {
    enqueue = enqueue;
  }
  const provider = { provider: 'test', model: 'm', dimensions: 3 };
  return {
    createEmbeddingProvider: vi.fn(() => provider),
    embeddingConfig: { batchSize: 4, batchMaxCharacters: 500 },
    TestIndexer,
    TestRepository,
    TestBatcher,
    enqueue,
    logJobEmbeddingIndexOutcome: vi.fn(),
    parseEvent: vi.fn(() => ({
      jobId: 'job-1',
      jobVersion: 2,
      outcome: 'INSERTED',
      occurredAt: '2026-01-01T00:00:00.000Z',
    })),
  };
});

const { enqueue, parseEvent } = mocks;

vi.mock('@/modules/ai-embeddings/index.js', () => ({
  createEmbeddingProvider: mocks.createEmbeddingProvider,
}));
vi.mock('@/modules/ai-embeddings/config/embedding.config.js', () => ({
  embeddingConfig: mocks.embeddingConfig,
}));
vi.mock('@/modules/job-embeddings/observability/job-embedding-coverage.js', () => ({
  logJobEmbeddingIndexOutcome: mocks.logJobEmbeddingIndexOutcome,
}));
vi.mock('@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js', () => ({
  PrismaJobEmbeddingRepository: mocks.TestRepository,
}));
vi.mock('@/modules/job-embeddings/services/job-embedding-indexer.service.js', () => ({
  JobEmbeddingIndexerService: mocks.TestIndexer,
}));
vi.mock('@/modules/job-embeddings/services/job-embedding-batch-coordinator.js', () => ({
  JobEmbeddingBatchCoordinator: mocks.TestBatcher,
}));
vi.mock('@/modules/job-embeddings/validators/job-embedding-event.validator.js', () => ({
  parseJobSemanticContentChangedEvent: mocks.parseEvent,
}));
vi.mock('@/infrastructure/messaging/index.js', async () => {
  const topology = await vi.importActual<
    typeof import('@/infrastructure/messaging/messaging.topology.js')
  >('@/infrastructure/messaging/messaging.topology.js');
  return {
    ...topology,
    messageBus: {
      subscribe: vi.fn(async () => {}),
    },
  };
});
vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { messageBus } from '@/infrastructure/messaging/index.js';
import {
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import { startJobEmbeddingWorker } from '@/workers/job-embedding.worker.js';

const subscribeMock = messageBus as { subscribe: ReturnType<typeof vi.fn> };
type SubscribeHandler = (message: { id: string; payload: unknown }) => Promise<void>;

describe('job-embedding.worker', () => {
  beforeEach(() => {
    subscribeMock.subscribe.mockClear();
    enqueue.mockClear();
    parseEvent.mockClear();
  });

  it('subscribes and processes a semantic content change event', async () => {
    await startJobEmbeddingWorker();

    expect(subscribeMock.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribeMock.subscribe).toHaveBeenCalledWith(
      MessageQueues.JOB_EMBEDDING_REQUESTS,
      MessageExchanges.DOMAIN_EVENTS,
      MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
      expect.any(Function),
      expect.objectContaining({ dlq: true, maxRetries: 5, prefetch: 4, quorum: false }),
    );

    const handler = subscribeMock.subscribe.mock.calls[0][3] as SubscribeHandler;
    await handler({ id: 'evt-1', payload: { jobId: 'job-1' } });

    expect(parseEvent).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(enqueue).toHaveBeenCalledWith('evt-1', {
      jobId: 'job-1',
      jobVersion: 2,
      outcome: 'INSERTED',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
