import type { Request, Response } from 'express';

import type { AiMailDraftService } from '@/modules/ai-mail/application/ai-mail-draft.service.js';
import type { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import type { AiMailGenerationService } from '@/modules/ai-mail/application/ai-mail-generation.service.js';
import type { MailGenerationRevisionService } from '@/modules/ai-mail/application/mail-generation-revision.service.js';
import type { MailDeliveryService } from '@/modules/ai-mail/delivery/application/mail-delivery.service.js';
import type { MailDeliveryHistoryService } from '@/modules/ai-mail/delivery/application/mail-delivery-history.service.js';
import type { PrepareFollowUpService } from '@/modules/ai-mail/delivery/application/prepare-follow-up.service.js';
import { aiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import {
  archiveAiMailDraftSchema,
  createAiMailDraftSchema,
  generateAiMailDraftSchema,
  generateSubjectAiMailDraftSchema,
  getAiMailDraftSchema,
  getAiMailDeliverySchema,
  listAiMailDeliveriesSchema,
  listAiMailDraftRevisionsSchema,
  listAiMailDraftsSchema,
  listDraftDeliveriesSchema,
  markReadyAiMailDraftSchema,
  prepareFollowUpSchema,
  regenerateAiMailDraftSchema,
  resolveAiMailDeliverySchema,
  restoreAiMailDraftRevisionSchema,
  rewriteAiMailDraftSchema,
  sendAiMailDraftSchema,
  sendPreviewAiMailDraftSchema,
  updateAiMailDraftSchema,
} from '@/modules/ai-mail/validations/ai-mail.schema.js';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';

const userId = (req: Request): string => {
  if (!req.user || req.user.principalType !== 'USER') {
    throw new AppError('Authentication required', 401);
  }
  return String(req.user.principalId);
};

export const getAiMailFeatureConfig = catchAsync(async (_req: Request, res: Response) => {
  return res.status(200).json(
    successResponse('AI Mail Composer configuration loaded', {
      enabled: aiMailConfig.enabled,
      saveDraftsEnabled: aiMailConfig.saveDraftsEnabled,
      partialRewriteEnabled: aiMailConfig.partialRewriteEnabled,
      provider: aiMailConfig.provider,
      limits: {
        maxJobDescriptionCharacters: aiMailConfig.limits.maxJobDescriptionCharacters,
        maxAdditionalContextCharacters: aiMailConfig.limits.maxAdditionalContextCharacters,
      },
      phase2: aiMailConfig.phase2,
    }),
  );
});

export const listAiMailResumes = (service: AiMailGenerationReadinessService) =>
  catchAsync(async (req: Request, res: Response) => {
    const result = await service.listResumes(userId(req));
    return res.status(200).json(successResponse('AI Mail resumes retrieved', result));
  });

export const getAiMailProfileSummary = (service: AiMailGenerationReadinessService) =>
  catchAsync(async (req: Request, res: Response) => {
    const result = await service.profileSummary(userId(req));
    return res.status(200).json(successResponse('AI Mail profile summary retrieved', result));
  });

export const getAiMailGenerationReadiness = (service: AiMailGenerationReadinessService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = getAiMailDraftSchema.parse({ params: req.params });
    const result = await service.evaluate(userId(req), params.draftId);
    return res.status(200).json(successResponse('AI Mail generation readiness evaluated', result));
  });

export const createAiMailDraft = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { body } = createAiMailDraftSchema.parse({ body: req.body });
    const draft = await service.create(userId(req), body);
    return res.status(201).json(successResponse('AI Mail draft created', draft));
  });

export const listAiMailDrafts = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { query } = listAiMailDraftsSchema.parse({ query: req.query });
    const page = await service.list(userId(req), query);
    return res.status(200).json(successResponse('AI Mail drafts retrieved', page));
  });

export const getAiMailDraft = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = getAiMailDraftSchema.parse({ params: req.params });
    const draft = await service.get(userId(req), params.draftId);
    return res.status(200).json(successResponse('AI Mail draft retrieved', draft));
  });

export const updateAiMailDraft = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = updateAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const draft = await service.update(userId(req), params.draftId, body);
    return res.status(200).json(successResponse('AI Mail draft updated', draft));
  });

export const archiveAiMailDraft = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = archiveAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const draft = await service.archive(userId(req), params.draftId, body.version);
    return res.status(200).json(successResponse('AI Mail draft archived', draft));
  });

export const markAiMailDraftReady = (service: AiMailDraftService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = markReadyAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const draft = await service.markReady(userId(req), params.draftId, body.version);
    return res.status(200).json(successResponse('AI Mail draft marked ready', draft));
  });

export const generateAiMailDraft = (service: AiMailGenerationService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = generateAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.generateFull(userId(req), params.draftId, body);
    return res.status(200).json(successResponse('AI Mail draft generated', result));
  });

export const regenerateAiMailDraft = (service: AiMailGenerationService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = regenerateAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.regenerateFull(userId(req), params.draftId, body);
    return res.status(200).json(successResponse('AI Mail draft regenerated', result));
  });

export const rewriteAiMailDraft = (service: AiMailGenerationService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = rewriteAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { operation, ...request } = body;
    const result = await service.rewrite(userId(req), params.draftId, operation, request);
    return res.status(200).json(successResponse('AI Mail draft rewritten', result));
  });

export const generateAiMailDraftSubject = (service: AiMailGenerationService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = generateSubjectAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.generateSubject(userId(req), params.draftId, body);
    return res.status(200).json(successResponse('AI Mail draft subject generated', result));
  });

export const listAiMailDraftRevisions = (service: MailGenerationRevisionService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = listAiMailDraftRevisionsSchema.parse({ params: req.params });
    const revisions = await service.list(userId(req), params.draftId);
    return res.status(200).json(successResponse('AI Mail draft revisions retrieved', revisions));
  });

export const restoreAiMailDraftRevision = (service: MailGenerationRevisionService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = restoreAiMailDraftRevisionSchema.parse({
      params: req.params,
      body: req.body,
    });
    const draft = await service.restore(
      userId(req),
      params.draftId,
      params.revisionId,
      body.version,
    );
    return res.status(200).json(successResponse('AI Mail draft revision restored', draft));
  });

export const previewAiMailDraftSend = (service: MailDeliveryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, query } = sendPreviewAiMailDraftSchema.parse({
      params: req.params,
      query: req.query,
    });
    const preview = await service.previewSend(
      userId(req),
      params.draftId,
      query.connectedAccountId,
    );
    return res.status(200).json(successResponse('AI Mail send preview', preview));
  });

export const sendAiMailDraft = (service: MailDeliveryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = sendAiMailDraftSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.sendApprovedDraft({
      userId: userId(req),
      draftId: params.draftId,
      version: body.version,
      contentHash: body.contentHash,
      connectedAccountId: body.connectedAccountId,
      idempotencyKey: body.idempotencyKey,
    });
    return res.status(200).json(successResponse('AI Mail draft sent', result));
  });

export const listAiMailDeliveries = (service: MailDeliveryHistoryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { query } = listAiMailDeliveriesSchema.parse({ query: req.query });
    const page = await service.list(userId(req), query);
    return res.status(200).json(successResponse('AI Mail deliveries retrieved', page));
  });

export const getAiMailDelivery = (service: MailDeliveryHistoryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = getAiMailDeliverySchema.parse({ params: req.params });
    const delivery = await service.get(userId(req), params.deliveryId);
    return res.status(200).json(successResponse('AI Mail delivery retrieved', delivery));
  });

export const listAiMailDraftDeliveries = (service: MailDeliveryHistoryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = listDraftDeliveriesSchema.parse({ params: req.params });
    const items = await service.listForDraft(userId(req), params.draftId);
    return res.status(200).json(successResponse('AI Mail draft deliveries retrieved', items));
  });

export const resolveAiMailDeliveryStatus = (service: MailDeliveryHistoryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = resolveAiMailDeliverySchema.parse({
      params: req.params,
      body: req.body,
    });
    const delivery = await service.resolveStatus(userId(req), params.deliveryId, body.resolution);
    return res.status(200).json(successResponse('AI Mail delivery status resolved', delivery));
  });

export const prepareAiMailFollowUp = (service: PrepareFollowUpService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = prepareFollowUpSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.prepare(userId(req), params.deliveryId, body);
    return res.status(201).json(successResponse('Follow-up draft prepared', result));
  });

export const getAiMailSendLimits = (service: MailDeliveryHistoryService) =>
  catchAsync(async (req: Request, res: Response) => {
    const limits = await service.getSendLimits(userId(req));
    return res.status(200).json(successResponse('AI Mail send limits', limits));
  });
