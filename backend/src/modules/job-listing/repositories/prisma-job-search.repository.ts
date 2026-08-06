import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from '@/modules/job-listing/types/job-listing.types.js';
import { buildJobSearchWhere } from '@/modules/job-listing/utils/build-job-search-where.js';
import { formatJobLocation } from '@/modules/job-listing/utils/format-job-location.js';
import { pickPrimaryApplyUrl } from '@/modules/job-listing/utils/safe-apply-url.js';

const jobListInclude = {
  company: true,
  sources: {
    orderBy: { priority: 'desc' as const },
    select: { applyUrl: true },
  },
};

type JobWithCompanyAndSources = Prisma.JobGetPayload<{ include: typeof jobListInclude }>;

export const toJobListDto = (job: JobWithCompanyAndSources): JobListDto => ({
  id: job.id,
  title: job.title,
  company: {
    slug: job.company.slug,
    name: job.company.name,
    logoUrl: job.company.logoUrl,
    verified: job.company.verified,
  },
  location: {
    formatted: formatJobLocation(job.remoteType, job.providerMetadata),
    remoteType: job.remoteType,
  },
  employmentType: job.employmentType,
  salary: {
    minimum: job.salaryMin ? Number(job.salaryMin) : null,
    maximum: job.salaryMax ? Number(job.salaryMax) : null,
    currency: job.currency,
  },
  skills: (job.skills as string[]) || [],
  publishedAt: (job.effectivePostedAt ?? job.postedAt)?.toISOString() ?? null,
  applyUrl: pickPrimaryApplyUrl(job.sources),
});

export class PrismaJobSearchRepository implements IJobSearchRepository {
  async search(options: JobSearchOptions): Promise<PaginatedJobResult<JobListDto>> {
    const { filters, pagination, sortBy } = options;
    const page = Math.max(1, pagination.page);
    const limit = Math.max(1, Math.min(100, pagination.limit));
    const skip = (page - 1) * limit;

    const isSalarySort = sortBy === 'salaryHighToLow' || sortBy === 'salaryLowToHigh';
    // Salary sorts must exclude undisclosed jobs; Postgres DESC puts NULLs first otherwise.
    const where: Prisma.JobWhereInput = isSalarySort
      ? {
          AND: [
            buildJobSearchWhere(filters),
            {
              OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
            },
          ],
        }
      : buildJobSearchWhere(filters);

    let orderBy: Prisma.JobOrderByWithRelationInput | Prisma.JobOrderByWithRelationInput[] = {
      createdAt: 'desc',
    };
    if (sortBy === 'salaryHighToLow') {
      // Highest top-of-range first; use min as tiebreaker when max ties.
      orderBy = [
        { salaryMax: { sort: 'desc', nulls: 'last' } },
        { salaryMin: { sort: 'desc', nulls: 'last' } },
      ];
    } else if (sortBy === 'salaryLowToHigh') {
      orderBy = [
        { salaryMin: { sort: 'asc', nulls: 'last' } },
        { salaryMax: { sort: 'asc', nulls: 'last' } },
      ];
    } else {
      // newest — match the posted date shown on cards (not DB ingest time).
      orderBy = [{ effectivePostedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    }

    const [totalItems, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: jobListInclude,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: jobs.map(toJobListDto),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<JobDetailDto | null> {
    // Public detail is ACTIVE-only; inactive/expired/removed jobs must not leak.
    const job = await prisma.job.findFirst({
      where: { id, status: 'ACTIVE' },
      include: jobListInclude,
    });

    if (!job) return null;

    return {
      ...toJobListDto(job),
      descriptionHtml: job.descriptionHtml,
      descriptionText: job.descriptionText,
      benefits: (job.benefits as string[]) || [],
      tags: (job.tags as string[]) || [],
      companyIndustry: job.company.industry,
      companySize: job.company.size,
    };
  }

  async findByIds(ids: readonly string[]): Promise<JobListDto[]> {
    if (ids.length === 0) return [];
    const uniqueIds = [...new Set(ids.filter((id) => id.trim()))];
    if (uniqueIds.length === 0) return [];

    const jobs = await prisma.job.findMany({
      where: {
        id: { in: uniqueIds },
        status: 'ACTIVE',
      },
      include: jobListInclude,
    });
    const byId = new Map(jobs.map((job) => [job.id, toJobListDto(job)]));
    return ids.map((id) => byId.get(id)).filter((job): job is JobListDto => job !== undefined);
  }
}
