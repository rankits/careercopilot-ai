import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/config/db.conf.js";
import { IJobRepository } from "@/modules/jobs/interfaces/IJobRepository.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { JobSearchFilters, PaginationOptions, PaginatedResult } from "@/modules/jobs/types/job.types.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export class PrismaJobRepository implements IJobRepository {
  async upsertMany(jobs: NormalizedJob[]): Promise<{ count: number }> {
    let count = 0;
    
    // Process jobs sequentially or in small batches to avoid deadlocks
    for (const job of jobs) {
      try {
        // 1. Ensure company exists
        await prisma.company.upsert({
          where: { slug: job.normalizedCompany },
          create: {
            slug: job.normalizedCompany,
            name: job.companyName,
          },
          update: {
            name: job.companyName,
          }
        });

        // 2. Upsert Job based on canonicalHash
        await prisma.job.upsert({
          where: { canonicalHash: job.canonicalHash },
          create: {
            canonicalHash: job.canonicalHash,
            companySlug: job.normalizedCompany,
            title: job.title,
            descriptionHtml: job.description,
            descriptionText: job.description,
            remoteType: job.location.isRemote ? "REMOTE" : "ONSITE",
            salaryMin: job.salary?.min,
            salaryMax: job.salary?.max,
            currency: job.salary?.currency,
            skills: (job.tags || []) as any,
            benefits: [] as any,
            tags: (job.tags || []) as any,
            status: "ACTIVE",
            postedAt: job.postedAt,
          },
          update: {
            title: job.title,
            descriptionHtml: job.description,
            descriptionText: job.description,
            status: "ACTIVE",
            lastSeen: new Date(),
          }
        });
        
        count++;
      } catch (err) {
        jobsLogger.error({ err, jobId: job.id }, "Failed to upsert job");
      }
    }

    return { count };
  }

  async findById(id: string): Promise<NormalizedJob | null> {
    throw new Error("Method not implemented in ingestion repository.");
  }

  async search(
    filters: JobSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NormalizedJob>> {
    throw new Error("Method not implemented in ingestion repository. Use job-listing module instead.");
  }

  async deleteExpiredBefore(timestamp: string): Promise<{ count: number }> {
    // Schema doesn't have expiresAt, we can check based on lastSeen instead.
    const result = await prisma.job.deleteMany({
      where: {
        lastSeen: {
          lt: new Date(timestamp)
        }
      }
    });
    return { count: result.count };
  }
}
