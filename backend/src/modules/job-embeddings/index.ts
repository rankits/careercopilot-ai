import { PrismaJobEmbeddingRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js';

export const jobEmbeddingRepository = new PrismaJobEmbeddingRepository();

export * from '@/modules/job-embeddings/config/job-embedding.config.js';
export * from '@/modules/job-embeddings/constants/job-embedding.constants.js';
export * from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
export * from '@/modules/job-embeddings/types/job-embedding.types.js';
export * from '@/modules/job-embeddings/utils/job-embedding-content.js';
export { PrismaJobEmbeddingRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js';
