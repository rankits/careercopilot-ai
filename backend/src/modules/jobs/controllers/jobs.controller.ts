import { NextFunction, Request, Response } from 'express';
import { jobsService } from '@/modules/jobs/JobModule.js';
import { successResponse } from '@/shared/utils/response.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export const triggerJobsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    jobsLogger.info(
      {
        providers: Array.isArray(req.body.providers) ? req.body.providers : undefined,
        allowedTiers: Array.isArray(req.body.allowedTiers) ? req.body.allowedTiers : undefined,
        dryRun: req.body.dryRun === true,
      },
      'Jobs trigger requested',
    );
    const summary = await jobsService.triggerBulkIngestion(req.body);

    jobsLogger.info(
      {
        totalHarvested: summary.totalHarvested,
        totalUnique: summary.totalUnique,
        totalDuplicates: summary.totalDuplicates,
        persistedInserted: summary.persistedInserted,
        persistedUpdated: summary.persistedUpdated,
        persistedMetadataOnly: summary.persistedMetadataOnly,
        persistedUnchanged: summary.persistedUnchanged,
        persistedFailed: summary.persistedFailed,
      },
      'Jobs trigger completed',
    );

    return res.status(200).json(
      successResponse('Job aggregation flow triggered successfully', {
        ...summary,
        requestedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const jobsHealthController = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await jobsService.getProviderHealth();

    return res.status(200).json(
      successResponse('Job provider health retrieved successfully', {
        providers: health,
        checkedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    next(error);
  }
};
