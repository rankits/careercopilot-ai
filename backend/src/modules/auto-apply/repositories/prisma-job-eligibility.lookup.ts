import { prisma } from '@/shared/config/db.conf.js';
import {
  IJobEligibilityLookup,
  JobEligibilitySnapshot,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';

export class PrismaJobEligibilityLookup implements IJobEligibilityLookup {
  async findJobSnapshot(jobId: string): Promise<JobEligibilitySnapshot | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sources: true },
    });
    if (!job) return null;

    return {
      id: job.id,
      title: job.title,
      companySlug: job.companySlug,
      remoteType: job.remoteType,
      salaryMax: job.salaryMax,
      status: job.status,
      sourceProviders: job.sources.map((source) => source.provider),
      canonicalJobId: job.canonicalHash,
    };
  }
}
