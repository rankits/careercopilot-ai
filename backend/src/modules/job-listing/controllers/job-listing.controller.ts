import { NextFunction, Request, Response } from 'express';
import { jobListingService } from '@/modules/job-listing/index.js';
import { recordJobListingRequest } from '@/modules/job-listing/observability/job-listing.metrics.js';
import { successResponse } from '@/shared/utils/response.js';
import {
  JobSearchOptions,
  JobSearchFilters,
  JobSearchPagination,
  JobSortBy,
} from '@/modules/job-listing/types/job-listing.types.js';

const hasActiveFilters = (filters: JobSearchFilters, sortBy: JobSortBy): boolean =>
  Boolean(
    filters.query ||
      filters.companySlug ||
      filters.location ||
      filters.remoteTypes?.length ||
      filters.employmentTypes?.length ||
      filters.skills?.length ||
      filters.minSalary !== undefined ||
      filters.maxSalary !== undefined ||
      (sortBy && sortBy !== 'newest'),
  );

export const searchJobsController = async (req: Request, res: Response, next: NextFunction) => {
  const started = performance.now();
  let filters: JobSearchFilters = {};
  let sortBy: JobSortBy = 'newest';

  try {
    const query = req.query as any;

    filters = {
      query: query.query,
      companySlug: query.companySlug,
      location: query.location,
      remoteTypes: query.remoteTypes
        ? Array.isArray(query.remoteTypes)
          ? query.remoteTypes
          : [query.remoteTypes]
        : undefined,
      employmentTypes: query.employmentTypes
        ? Array.isArray(query.employmentTypes)
          ? query.employmentTypes
          : [query.employmentTypes]
        : undefined,
      skills: query.skills
        ? Array.isArray(query.skills)
          ? query.skills
          : [query.skills]
        : undefined,
      minSalary: query.minSalary ? Number(query.minSalary) : undefined,
      maxSalary: query.maxSalary ? Number(query.maxSalary) : undefined,
    };

    const pagination: JobSearchPagination = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    };

    sortBy = query.sortBy || 'newest';

    const options: JobSearchOptions = {
      filters,
      pagination,
      sortBy,
    };

    const result = await jobListingService.searchJobs(options);
    const resultCount = result.pagination.totalItems;
    const empty = resultCount === 0;

    recordJobListingRequest({
      outcome: empty ? 'empty' : 'success',
      statusCode: 200,
      durationMs: performance.now() - started,
      hasFilters: hasActiveFilters(filters, sortBy),
      resultCount,
    });

    return res.status(200).json(
      successResponse('Jobs retrieved successfully', {
        items: result.items,
        pagination: result.pagination,
        appliedFilters: filters,
      }),
    );
  } catch (error) {
    recordJobListingRequest({
      outcome: 'error',
      statusCode: 500,
      durationMs: performance.now() - started,
      hasFilters: hasActiveFilters(filters, sortBy),
    });
    next(error);
  }
};

export const getJobByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const job = await jobListingService.getJobDetails(jobId as string);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found',
      });
    }

    return res.status(200).json(successResponse('Job retrieved successfully', job));
  } catch (error) {
    next(error);
  }
};
