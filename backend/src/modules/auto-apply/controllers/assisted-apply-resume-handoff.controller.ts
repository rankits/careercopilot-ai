import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApprovedResumeVersionRepository } from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { PrismaApplicationPageAnalysisRepository } from '@/modules/auto-apply/repositories/prisma-application-page-analysis.repository.js';
import { PrismaChannelDetectionJobLookup } from '@/modules/auto-apply/repositories/prisma-channel-detection.lookup.js';
import { ResumeSelectionService } from '@/modules/auto-apply/services/resume-selection.service.js';
import { ResumeAnalysisService } from '@/modules/auto-apply/services/resume-analysis.service.js';
import { ResumeContentResolver } from '@/modules/auto-apply/services/resume-content-resolver.service.js';
import { BuilderResumeSyncService } from '@/modules/auto-apply/services/builder-resume-sync.service.js';
import { ResumeBuilderContextService } from '@/modules/auto-apply/services/resume-builder-context.service.js';
import { AssistedApplyHandoffService } from '@/modules/auto-apply/services/assisted-apply-handoff.service.js';
import { applicationReadinessService } from '@/modules/auto-apply/wiring/readiness.wiring.js';
import { getOperationId } from '@/modules/auto-apply/middlewares/operation-id.middleware.js';

const applications = new PrismaJobApplicationRepository();
const resumeVersions = new PrismaApprovedResumeVersionRepository();
const consents = new PrismaApplicationConsentRepository();
const analysisRepository = new PrismaApplicationPageAnalysisRepository();
const contentResolver = new ResumeContentResolver();

export const resumeSelectionService = new ResumeSelectionService(
  applications,
  resumeVersions,
  consents,
);

export const resumeAnalysisService = new ResumeAnalysisService(
  applications,
  resumeVersions,
  consents,
  analysisRepository,
  contentResolver,
);

export const builderResumeSyncService = new BuilderResumeSyncService(applications, consents);

export const resumeBuilderContextService = new ResumeBuilderContextService(
  applications,
  resumeVersions,
  consents,
  analysisRepository,
);

export const assistedApplyHandoffService = new AssistedApplyHandoffService(
  applications,
  new PrismaChannelDetectionJobLookup(),
  applicationReadinessService,
);

export const updateResumeSelectionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const resumeVersionId = String(req.body.resumeVersionId ?? '');
    const result = await resumeSelectionService.selectResume(userId, id, resumeVersionId);
    return res.status(200).json(successResponse('Resume selection updated', result));
  } catch (error) {
    return next(error);
  }
};

export const ensureDefaultResumeSelectionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await resumeSelectionService.ensureDefaultSelection(userId, id);
    return res.status(200).json(successResponse('Resume selection resolved', result));
  } catch (error) {
    return next(error);
  }
};

export const analyzeResumeForApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const forceRefresh = req.body?.forceRefresh === true;
    const result = await resumeAnalysisService.analyze(userId, id, { forceRefresh });
    return res.status(200).json(successResponse('Resume analysis ready', result));
  } catch (error) {
    return next(error);
  }
};

export const syncBuilderResumeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await builderResumeSyncService.syncFromBuilderVersion({
      userId,
      jobApplicationId: id,
      resumeId: String(req.body.resumeId ?? ''),
      builderVersionId: Number(req.body.builderVersionId),
      label: typeof req.body.label === 'string' ? req.body.label : undefined,
    });
    return res.status(200).json(successResponse('Builder resume synced for application', result));
  } catch (error) {
    return next(error);
  }
};

export const getResumeBuilderContextController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await resumeBuilderContextService.getContext(userId, id);
    return res.status(200).json(successResponse('Resume Builder context ready', result));
  } catch (error) {
    return next(error);
  }
};

export const handoffApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const operationId = getOperationId();
    const result = await assistedApplyHandoffService.handoff(userId, id, operationId);
    return res.status(200).json(successResponse('Handoff opened', result));
  } catch (error) {
    return next(error);
  }
};
