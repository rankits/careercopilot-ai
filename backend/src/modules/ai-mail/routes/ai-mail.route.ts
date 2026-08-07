import express from 'express';

import { AiMailDraftService } from '@/modules/ai-mail/application/ai-mail-draft.service.js';
import { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import { AiMailGenerationService } from '@/modules/ai-mail/application/ai-mail-generation.service.js';
import { createMailGenerationProvider } from '@/modules/ai-mail/application/mail-generation-provider.factory.js';
import { MailGenerationRevisionService } from '@/modules/ai-mail/application/mail-generation-revision.service.js';
import { CandidateProfileContextBuilder } from '@/modules/ai-mail/application/candidate-profile-context.builder.js';
import { JobContextBuilder } from '@/modules/ai-mail/application/job-context.builder.js';
import { JobDescriptionNormalizer } from '@/modules/ai-mail/application/job-description-normalizer.js';
import { MailGenerationContextBuilder } from '@/modules/ai-mail/application/mail-generation-context.builder.js';
import {
  ResumeContextBuilder,
  ResumeContextLoader,
} from '@/modules/ai-mail/application/resume-context.builder.js';
import { aiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { MailDeliveryService } from '@/modules/ai-mail/delivery/application/mail-delivery.service.js';
import { MailDeliveryHistoryService } from '@/modules/ai-mail/delivery/application/mail-delivery-history.service.js';
import { PrepareFollowUpService } from '@/modules/ai-mail/delivery/application/prepare-follow-up.service.js';
import { resumeFileAttachmentResolver } from '@/modules/ai-mail/delivery/attachments/resume-attachment.resolver.js';
import { createMailboxProvider } from '@/modules/ai-mail/delivery/providers/mailbox-provider.factory.js';
import { prismaMailDeliveryRepository } from '@/modules/ai-mail/delivery/repositories/prisma-mail-delivery.repository.js';
import {
  archiveAiMailDraft,
  createAiMailDraft,
  generateAiMailDraft,
  generateAiMailDraftSubject,
  getAiMailDelivery,
  getAiMailDraft,
  getAiMailFeatureConfig,
  getAiMailGenerationReadiness,
  getAiMailProfileSummary,
  getAiMailSendLimits,
  listAiMailDeliveries,
  listAiMailDraftDeliveries,
  listAiMailDraftRevisions,
  listAiMailResumes,
  listAiMailDrafts,
  markAiMailDraftReady,
  prepareAiMailFollowUp,
  previewAiMailDraftSend,
  regenerateAiMailDraft,
  resolveAiMailDeliveryStatus,
  restoreAiMailDraftRevision,
  rewriteAiMailDraft,
  sendAiMailDraft,
  updateAiMailDraft,
} from '@/modules/ai-mail/controllers/ai-mail.controller.js';
import { prismaAiMailDraftRepository } from '@/modules/ai-mail/repositories/prisma-ai-mail-draft.repository.js';
import { prismaCandidateProfileContextRepository } from '@/modules/ai-mail/repositories/prisma-candidate-profile-context.repository.js';
import { prismaResumeContextRepository } from '@/modules/ai-mail/repositories/prisma-resume-context.repository.js';
import {
  archiveAiMailDraftSchema,
  createAiMailDraftSchema,
  generateAiMailDraftSchema,
  generateSubjectAiMailDraftSchema,
  getAiMailDeliverySchema,
  getAiMailDraftSchema,
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
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { aiMailSendRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { CAREER_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

const router = express.Router();
export const aiMailDraftService = new AiMailDraftService(prismaAiMailDraftRepository);
const contextLimits = {
  maxProfileSkills: aiMailConfig.limits.maxProfileSkills,
  maxExperienceEntries: aiMailConfig.limits.maxExperienceEntries,
  maxExperienceHighlightsPerEntry: aiMailConfig.limits.maxExperienceHighlightsPerEntry,
  maxProjects: aiMailConfig.limits.maxProjects,
  maxAchievements: aiMailConfig.limits.maxAchievements,
};
const candidateProfileContextBuilder = new CandidateProfileContextBuilder(contextLimits);
const resumeContextLoader = new ResumeContextLoader(
  prismaResumeContextRepository,
  new ResumeContextBuilder(contextLimits),
);
export const aiMailGenerationReadinessService = new AiMailGenerationReadinessService(
  prismaAiMailDraftRepository,
  prismaCandidateProfileContextRepository,
  candidateProfileContextBuilder,
  resumeContextLoader,
  new JobDescriptionNormalizer(aiMailConfig.limits.maxJobDescriptionCharacters),
  new JobContextBuilder({
    maxJobRequirements: aiMailConfig.limits.maxJobRequirements,
    maxJobResponsibilities: aiMailConfig.limits.maxJobResponsibilities,
    maxJobKeywords: aiMailConfig.limits.maxJobKeywords,
  }),
  new MailGenerationContextBuilder(),
);
export const aiMailRevisionService = new MailGenerationRevisionService(prismaAiMailDraftRepository);
export const aiMailGenerationService = new AiMailGenerationService(
  prismaAiMailDraftRepository,
  aiMailGenerationReadinessService,
  aiMailRevisionService,
  createMailGenerationProvider(aiMailConfig.provider),
);

export const mailDeliveryService = new MailDeliveryService(
  prismaAiMailDraftRepository,
  prismaMailDeliveryRepository,
  createMailboxProvider('google'),
  resumeFileAttachmentResolver,
  aiMailConfig,
);
export const mailDeliveryHistoryService = new MailDeliveryHistoryService(
  prismaMailDeliveryRepository,
  aiMailConfig,
);
export const prepareFollowUpService = new PrepareFollowUpService(
  prismaAiMailDraftRepository,
  prismaMailDeliveryRepository,
  aiMailConfig,
);

router.get('/config', authMiddleware, requirePrincipalType('USER'), getAiMailFeatureConfig);
router.get(
  '/send-limits',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  getAiMailSendLimits(mailDeliveryHistoryService),
);
router.get(
  '/deliveries',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(listAiMailDeliveriesSchema),
  listAiMailDeliveries(mailDeliveryHistoryService),
);
router.get(
  '/deliveries/:deliveryId',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(getAiMailDeliverySchema),
  getAiMailDelivery(mailDeliveryHistoryService),
);
router.post(
  '/deliveries/:deliveryId/resolve-status',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(resolveAiMailDeliverySchema),
  resolveAiMailDeliveryStatus(mailDeliveryHistoryService),
);
router.post(
  '/deliveries/:deliveryId/prepare-follow-up',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(prepareFollowUpSchema),
  prepareAiMailFollowUp(prepareFollowUpService),
);
router.get(
  '/resumes',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  listAiMailResumes(aiMailGenerationReadinessService),
);
router.get(
  '/profile-summary',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  getAiMailProfileSummary(aiMailGenerationReadinessService),
);

router.post(
  '/drafts',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(createAiMailDraftSchema),
  createAiMailDraft(aiMailDraftService),
);
router.get(
  '/drafts',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(listAiMailDraftsSchema),
  listAiMailDrafts(aiMailDraftService),
);
router.get(
  '/drafts/:draftId/generation-readiness',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(getAiMailDraftSchema),
  getAiMailGenerationReadiness(aiMailGenerationReadinessService),
);
router.get(
  '/drafts/:draftId/send-preview',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(sendPreviewAiMailDraftSchema),
  previewAiMailDraftSend(mailDeliveryService),
);
router.get(
  '/drafts/:draftId/deliveries',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(listDraftDeliveriesSchema),
  listAiMailDraftDeliveries(mailDeliveryHistoryService),
);
router.post(
  '/drafts/:draftId/send',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  aiMailSendRateLimiter,
  validateResource(sendAiMailDraftSchema),
  sendAiMailDraft(mailDeliveryService),
);
router.get(
  '/drafts/:draftId',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(getAiMailDraftSchema),
  getAiMailDraft(aiMailDraftService),
);
router.patch(
  '/drafts/:draftId',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(updateAiMailDraftSchema),
  updateAiMailDraft(aiMailDraftService),
);
router.delete(
  '/drafts/:draftId',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(archiveAiMailDraftSchema),
  archiveAiMailDraft(aiMailDraftService),
);
router.post(
  '/drafts/:draftId/mark-ready',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(markReadyAiMailDraftSchema),
  markAiMailDraftReady(aiMailDraftService),
);
router.post(
  '/drafts/:draftId/generate',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(generateAiMailDraftSchema),
  generateAiMailDraft(aiMailGenerationService),
);
router.post(
  '/drafts/:draftId/regenerate',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(regenerateAiMailDraftSchema),
  regenerateAiMailDraft(aiMailGenerationService),
);
router.post(
  '/drafts/:draftId/rewrite',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(rewriteAiMailDraftSchema),
  rewriteAiMailDraft(aiMailGenerationService),
);
router.post(
  '/drafts/:draftId/generate-subject',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(generateSubjectAiMailDraftSchema),
  generateAiMailDraftSubject(aiMailGenerationService),
);
router.get(
  '/drafts/:draftId/revisions',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  validateResource(listAiMailDraftRevisionsSchema),
  listAiMailDraftRevisions(aiMailRevisionService),
);
router.post(
  '/drafts/:draftId/revisions/:revisionId/restore',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.UPDATE_OWN),
  validateResource(restoreAiMailDraftRevisionSchema),
  restoreAiMailDraftRevision(aiMailRevisionService),
);

export default router;
