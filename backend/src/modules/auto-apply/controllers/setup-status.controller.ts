import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { SetupStatusService } from '@/modules/auto-apply/services/setup-status.service.js';
import { PrismaCandidateApplicationProfileRepository } from '@/modules/auto-apply/repositories/prisma-candidate-profile.repository.js';
import { PrismaApplicationAnswerRepository } from '@/modules/auto-apply/repositories/prisma-application-answer.repository.js';
import { PrismaApprovedResumeVersionRepository } from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { PrismaUserContactLookup } from '@/modules/auto-apply/repositories/prisma-readiness-lookups.repository.js';
import { applicationReadinessService } from '@/modules/auto-apply/wiring/readiness.wiring.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

export const setupStatusService = new SetupStatusService(
  applicationReadinessService,
  new PrismaCandidateApplicationProfileRepository(),
  new PrismaApplicationAnswerRepository(),
  new PrismaApprovedResumeVersionRepository(),
  new PrismaApplicationConsentRepository(),
  new PrismaUserContactLookup(),
);

export const getSetupStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const status = await setupStatusService.getSetupStatus(userId);
    return res
      .status(200)
      .json(successResponse('Application setup status fetched successfully', status));
  } catch (error) {
    return next(error);
  }
};
