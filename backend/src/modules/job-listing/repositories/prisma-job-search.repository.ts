import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from '@/modules/job-listing/types/job-listing.types.js';

export class PrismaJobSearchRepository implements IJobSearchRepository {
  async search(options: JobSearchOptions): Promise<PaginatedJobResult<JobListDto>> {
    const { filters, pagination, sortBy } = options;
    const page = Math.max(1, pagination.page);
    const limit = Math.max(1, Math.min(100, pagination.limit));
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      status: 'ACTIVE',
      ...(filters.query && {
        OR: [
          { title: { contains: filters.query, mode: 'insensitive' } },
          { descriptionText: { contains: filters.query, mode: 'insensitive' } },
          { company: { name: { contains: filters.query, mode: 'insensitive' } } },
        ],
      }),
      ...(filters.companySlug && { companySlug: filters.companySlug }),
      ...(filters.remoteTypes?.length && {
        remoteType: { in: filters.remoteTypes },
      }),
      ...(filters.employmentTypes?.length && {
        employmentType: { in: filters.employmentTypes },
      }),
      ...(filters.minSalary !== undefined && {
        salaryMax: { gte: filters.minSalary },
      }),
      ...(filters.maxSalary !== undefined && {
        salaryMin: { lte: filters.maxSalary },
      }),
    };

    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'salaryHighToLow') {
      orderBy = { salaryMax: 'desc' };
    } else if (sortBy === 'salaryLowToHigh') {
      orderBy = { salaryMin: 'asc' };
    }

    const [totalItems, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { company: true },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const items: JobListDto[] = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: {
        slug: job.company.slug,
        name: job.company.name,
        logoUrl: job.company.logoUrl,
        verified: job.company.verified,
      },
      location: {
        formatted: 'Unknown',
        remoteType: job.remoteType,
      },
      employmentType: job.employmentType,
      salary: {
        minimum: job.salaryMin ? Number(job.salaryMin) : null,
        maximum: job.salaryMax ? Number(job.salaryMax) : null,
        currency: job.currency,
      },
      skills: (job.skills as string[]) || [],
      publishedAt: job.postedAt ? job.postedAt.toISOString() : null,
      expiresAt: null,
    }));

    return {
      items,
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
    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!job) return null;

    return {
      id: job.id,
      title: job.title,
      company: {
        slug: job.company.slug,
        name: job.company.name,
        logoUrl: job.company.logoUrl,
        verified: job.company.verified,
      },
      location: {
        formatted: 'Unknown',
        remoteType: job.remoteType,
      },
      employmentType: job.employmentType,
      salary: {
        minimum: job.salaryMin ? Number(job.salaryMin) : null,
        maximum: job.salaryMax ? Number(job.salaryMax) : null,
        currency: job.currency,
      },
      skills: (job.skills as string[]) || [],
      publishedAt: job.postedAt ? job.postedAt.toISOString() : null,
      expiresAt: null,
      descriptionHtml: job.descriptionHtml,
      descriptionText: job.descriptionText,
      benefits: (job.benefits as string[]) || [],
      tags: (job.tags as string[]) || [],
      companyIndustry: job.company.industry,
      companySize: job.company.size,
    };
  }
}
