export { default as aiMailRoutes } from '@/modules/ai-mail/routes/ai-mail.route.js';
export type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
export type { MailGenerationProvider } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
export { AiMailDraftService } from '@/modules/ai-mail/application/ai-mail-draft.service.js';
export { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
export { CandidateProfileContextBuilder } from '@/modules/ai-mail/application/candidate-profile-context.builder.js';
export { JobContextBuilder } from '@/modules/ai-mail/application/job-context.builder.js';
export { JobDescriptionNormalizer } from '@/modules/ai-mail/application/job-description-normalizer.js';
export { MailGenerationContextBuilder } from '@/modules/ai-mail/application/mail-generation-context.builder.js';
export {
  ResumeContextBuilder,
  ResumeContextLoader,
} from '@/modules/ai-mail/application/resume-context.builder.js';
export { PrismaAiMailDraftRepository } from '@/modules/ai-mail/repositories/prisma-ai-mail-draft.repository.js';
export * from '@/modules/ai-mail/domain/ai-mail.types.js';
export * from '@/modules/ai-mail/domain/content-hasher.js';
export * from '@/modules/ai-mail/domain/placeholder-detector.js';
export * from '@/modules/ai-mail/domain/draft-state-machine.js';
