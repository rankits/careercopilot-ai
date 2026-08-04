import type { JobEmbeddingSourceRepository } from '@/modules/job-embeddings/contracts/job-embedding-source.repository.js';
import type { JobEmbeddingSource } from '@/modules/job-embeddings/types/job-embedding.types.js';
import { prisma } from '@/shared/config/db.conf.js';

export class PrismaJobEmbeddingSourceRepository implements JobEmbeddingSourceRepository {
  async findByJobId(jobId: string): Promise<JobEmbeddingSource | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        version: true,
        status: true,
        companySlug: true,
        title: true,
        descriptionText: true,
        remoteType: true,
        employmentType: true,
        skills: true,
        tags: true,
        providerMetadata: true,
        effectivePostedAt: true,
        company: { select: { name: true } },
      },
    });
    if (!job) return null;
    const metadata =
      typeof job.providerMetadata === 'object' &&
      job.providerMetadata !== null &&
      !Array.isArray(job.providerMetadata)
        ? job.providerMetadata
        : {};
    const semanticCompanyName = metadata.semanticCompanyName;
    return {
      jobId: job.id,
      version: job.version,
      status: job.status,
      companySlug: job.companySlug,
      companyName: typeof semanticCompanyName === 'string' ? semanticCompanyName : job.company.name,
      title: job.title,
      descriptionText: job.descriptionText,
      remoteType: job.remoteType,
      employmentType: job.employmentType,
      skills: job.skills,
      tags: job.tags,
      effectivePostedAt: job.effectivePostedAt,
    };
  }
}
