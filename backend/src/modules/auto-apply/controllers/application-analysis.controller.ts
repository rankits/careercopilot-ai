import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import {
  jobPageAnalyzerService,
  prepareApplicationService,
} from '@/modules/auto-apply/wiring/analysis.wiring.js';

export const createJobAnalysisController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const analysis = await jobPageAnalyzerService.analyzeOrGetFresh({
      userId,
      jobId,
      forceRefresh: req.body?.forceRefresh === true,
    });
    return res.status(200).json(successResponse('Job page analysis ready', analysis));
  } catch (error) {
    return next(error);
  }
};

export const getLatestJobAnalysisController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const analysis = await jobPageAnalyzerService.getLatest(jobId);
    return res.status(200).json(successResponse('Latest job page analysis', analysis));
  } catch (error) {
    return next(error);
  }
};

export const prepareApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const result = await prepareApplicationService.prepare({
      userId,
      jobId,
      jobApplicationId: req.body?.jobApplicationId,
      applyMode: req.body?.applyMode ?? 'PREPARE',
      resumeVersionId: req.body?.resumeVersionId,
      allowMatchCompute: req.body?.allowMatchCompute === true,
      forceRefreshAnalysis: req.body?.forceRefreshAnalysis === true,
    });
    return res.status(200).json(successResponse('Application preparation complete', result));
  } catch (error) {
    return next(error);
  }
};
