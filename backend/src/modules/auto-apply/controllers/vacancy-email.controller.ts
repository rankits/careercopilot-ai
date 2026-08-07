import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { VacancyEmailDiscoveryService } from '@/modules/auto-apply/services/vacancy-email-discovery.service.js';
import { PrismaJobDescriptionLookup } from '@/modules/auto-apply/repositories/prisma-job-description.lookup.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

export const vacancyEmailDiscoveryService = new VacancyEmailDiscoveryService(
  new PrismaJobDescriptionLookup(),
);

export const discoverVacancyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const result = await vacancyEmailDiscoveryService.discoverForJob(jobId);
    return res.status(200).json(successResponse('Vacancy email discovery completed', result));
  } catch (error) {
    return next(error);
  }
};
