import { NextFunction, Request, Response } from "express";
import { jobsService } from "@/modules/jobs/JobModule.js";
import { successResponse } from "@/shared/utils/response.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export const triggerJobsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    jobsLogger.info(
      {
        body: req.body,
      },
      "Jobs trigger requested",
    );
    const summary = await jobsService.triggerBulkIngestion(req.body);

    jobsLogger.info(
      {
        summary,
      },
      "Jobs trigger completed",
    );

    return res.status(200).json(
      successResponse("Job aggregation flow triggered successfully", {
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
      successResponse("Job provider health retrieved successfully", {
        providers: health,
        checkedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    next(error);
  }
};

