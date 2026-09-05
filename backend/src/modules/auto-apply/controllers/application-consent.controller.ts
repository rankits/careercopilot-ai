import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { ApplicationConsentService } from '@/modules/auto-apply/services/application-consent.service.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';

const repository = new PrismaApplicationConsentRepository();
export const applicationConsentService = new ApplicationConsentService(repository);

export const listApplicationConsentsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const consents = await applicationConsentService.listConsents(userId);
    return res.status(200).json(successResponse('Consent grants fetched successfully', consents));
  } catch (error) {
    return next(error);
  }
};

export const grantApplicationConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const consent = await applicationConsentService.grantConsent(userId, req.body.consentType);
    void autoApplyEventService.record({
      userId,
      eventType: 'CONSENT_GRANTED',
      metadata: { consentType: consent.consentType },
    });
    return res.status(201).json(successResponse('Consent granted successfully', consent));
  } catch (error) {
    return next(error);
  }
};

export const revokeApplicationConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const consent = await applicationConsentService.revokeConsent(userId, id);
    void autoApplyEventService.record({
      userId,
      eventType: 'CONSENT_REVOKED',
      metadata: { consentType: consent.consentType },
    });
    return res.status(200).json(successResponse('Consent revoked successfully', consent));
  } catch (error) {
    return next(error);
  }
};
