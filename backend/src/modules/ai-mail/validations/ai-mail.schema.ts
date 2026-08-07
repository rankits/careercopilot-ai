import { z } from 'zod';

import { aiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import {
  DEFAULT_MAIL_GENERATION_CONSTRAINTS,
  type MailGenerationConstraints,
} from '@/modules/ai-mail/domain/ai-mail.types.js';

const limits = aiMailConfig.limits;
const empty = z.object({}).strict().optional();
const uuid = z.string().uuid();
const draftParams = z.object({ draftId: uuid }).strict();
const version = z.number().int().positive();

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null)
    .optional();

const dedupedStrings = z
  .array(z.string().trim().min(1).max(limits.maxConstraintCharacters))
  .max(20)
  .transform((items) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

const constraintsSchema = z
  .object({
    tone: z
      .enum(['professional', 'concise', 'warm', 'confident', 'formal', 'custom'])
      .default(DEFAULT_MAIL_GENERATION_CONSTRAINTS.tone),
    customTone: optionalTrimmed(limits.maxConstraintCharacters),
    maximumWords: z.number().int().min(25).max(2_000).optional(),
    includeCallToAction: z
      .boolean()
      .default(DEFAULT_MAIL_GENERATION_CONSTRAINTS.includeCallToAction),
    includeResumeMention: z
      .boolean()
      .default(DEFAULT_MAIL_GENERATION_CONSTRAINTS.includeResumeMention),
    emphasizeSkills: dedupedStrings.default([]),
    emphasizeAchievements: dedupedStrings.default([]),
    avoidTopics: dedupedStrings.default([]),
    customInstructions: optionalTrimmed(limits.maxConstraintCharacters),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.tone === 'custom' && !value.customTone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customTone'],
        message: 'customTone is required when tone is custom',
      });
    }
    const characters = JSON.stringify(value).length;
    if (characters > limits.maxConstraintCharacters) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Constraints exceed ${limits.maxConstraintCharacters} characters`,
      });
    }
  });

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  }, 'Only HTTP/HTTPS URLs are accepted');

const plainBodyHtml = z
  .string()
  .trim()
  .max(limits.maxBodyCharacters)
  .refine((value) => !/<[^>]*>/u.test(value), 'HTML tags are not accepted in Phase 1B');

const mutableFields = {
  recruiterEmail: z.string().trim().email().max(320).toLowerCase(),
  recruiterName: optionalTrimmed(200),
  companyName: optionalTrimmed(200),
  roleTitle: optionalTrimmed(200),
  jobUrl: httpUrl.optional(),
  jobDescription: z.string().trim().min(1).max(limits.maxJobDescriptionCharacters),
  additionalContext: optionalTrimmed(limits.maxAdditionalContextCharacters),
  resumeId: uuid,
  constraints: constraintsSchema,
  subject: optionalTrimmed(limits.maxSubjectCharacters),
  bodyText: optionalTrimmed(limits.maxBodyCharacters),
  bodyHtml: plainBodyHtml.transform((value) => value || undefined).optional(),
};

const createBody = z
  .object({
    ...mutableFields,
    constraints: constraintsSchema
      .optional()
      .default(() => ({ ...DEFAULT_MAIL_GENERATION_CONSTRAINTS }) as MailGenerationConstraints),
  })
  .strict();

const patchBody = z
  .object(mutableFields)
  .partial()
  .extend({
    version,
    recruiterName: nullableTrimmed(200),
    companyName: nullableTrimmed(200),
    roleTitle: nullableTrimmed(200),
    jobUrl: httpUrl.nullable().optional(),
    additionalContext: nullableTrimmed(limits.maxAdditionalContextCharacters),
    subject: nullableTrimmed(limits.maxSubjectCharacters),
    bodyText: nullableTrimmed(limits.maxBodyCharacters),
    bodyHtml: plainBodyHtml.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== 'version'), {
    message: 'At least one draft field is required',
  });

const versionBody = z.object({ version }).strict();

export const createAiMailDraftSchema = z
  .object({ body: createBody, query: empty, params: empty })
  .strict();

export const listAiMailDraftsSchema = z
  .object({
    body: empty,
    params: empty,
    query: z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z
          .enum([
            'input',
            'generating',
            'generated',
            'edited',
            'generation_failed',
            'ready_to_send',
            'archived',
          ])
          .optional(),
        search: z.string().trim().min(1).max(200).optional(),
      })
      .strict(),
  })
  .strict();

export const getAiMailDraftSchema = z
  .object({ body: empty, query: empty, params: draftParams })
  .strict();

export const updateAiMailDraftSchema = z
  .object({ body: patchBody, query: empty, params: draftParams })
  .strict();

export const archiveAiMailDraftSchema = z
  .object({ body: versionBody, query: empty, params: draftParams })
  .strict();

export const markReadyAiMailDraftSchema = z
  .object({ body: versionBody, query: empty, params: draftParams })
  .strict();

const generationBody = z
  .object({
    version,
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
    confirmOverwriteUserEdits: z.boolean().optional(),
  })
  .strict();

const rewriteBody = generationBody
  .extend({
    operation: z.enum(['rewrite_tone', 'shorten', 'expand', 'fix_grammar', 'rewrite_selection']),
    selectedText: z.string().trim().min(1).max(limits.maxBodyCharacters).optional(),
    rewriteInstruction: z
      .object({
        tone: z.string().trim().min(1).max(200).optional(),
        maximumWords: z.number().int().min(25).max(2_000).optional(),
        instruction: z.string().trim().min(1).max(limits.maxConstraintCharacters).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.operation === 'rewrite_selection' && !value.selectedText) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedText'],
        message: 'selectedText is required for rewrite_selection',
      });
    }
  });

const revisionParams = draftParams.extend({ revisionId: uuid }).strict();

export const generateAiMailDraftSchema = z
  .object({ body: generationBody, query: empty, params: draftParams })
  .strict();

export const regenerateAiMailDraftSchema = generateAiMailDraftSchema;

export const generateSubjectAiMailDraftSchema = generateAiMailDraftSchema;

export const rewriteAiMailDraftSchema = z
  .object({ body: rewriteBody, query: empty, params: draftParams })
  .strict();

export const listAiMailDraftRevisionsSchema = z
  .object({ body: empty, query: empty, params: draftParams })
  .strict();

export const restoreAiMailDraftRevisionSchema = z
  .object({ body: versionBody, query: empty, params: revisionParams })
  .strict();

export const sendPreviewAiMailDraftSchema = z
  .object({
    body: empty,
    query: z
      .object({
        connectedAccountId: z.coerce.number().int().positive(),
      })
      .strict(),
    params: draftParams,
  })
  .strict();

export const sendAiMailDraftSchema = z
  .object({
    body: z
      .object({
        version,
        contentHash: z.string().trim().min(16).max(128),
        connectedAccountId: z.number().int().positive(),
        idempotencyKey: z.string().trim().min(8).max(128),
      })
      .strict(),
    query: empty,
    params: draftParams,
  })
  .strict();

const deliveryParams = z.object({ deliveryId: uuid }).strict();

export const listAiMailDeliveriesSchema = z
  .object({
    body: empty,
    query: z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
        status: z.enum(['pending', 'sending', 'sent', 'failed', 'unknown', 'cancelled']).optional(),
        draftId: uuid.optional(),
        company: z.string().trim().min(1).max(200).optional(),
        role: z.string().trim().min(1).max(200).optional(),
        connectedAccountId: z.coerce.number().int().positive().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .strict(),
    params: z.object({}).strict().optional(),
  })
  .strict();

export const getAiMailDeliverySchema = z
  .object({ body: empty, query: empty, params: deliveryParams })
  .strict();

export const listDraftDeliveriesSchema = z
  .object({ body: empty, query: empty, params: draftParams })
  .strict();

export const resolveAiMailDeliverySchema = z
  .object({
    body: z
      .object({
        resolution: z.enum(['confirmed_sent', 'confirmed_not_sent']),
      })
      .strict(),
    query: empty,
    params: deliveryParams,
  })
  .strict();

export const prepareFollowUpSchema = z
  .object({
    body: z
      .object({
        style: z.enum(['concise', 'polite', 'value_add', 'check_in']).optional(),
        additionalInstruction: z.string().trim().max(limits.maxConstraintCharacters).optional(),
      })
      .strict(),
    query: empty,
    params: deliveryParams,
  })
  .strict();

export type CreateAiMailDraftRequest = z.infer<typeof createBody>;
export type UpdateAiMailDraftRequest = z.infer<typeof patchBody>;
export type ListAiMailDraftsRequest = z.infer<typeof listAiMailDraftsSchema>['query'];
export type AiMailGenerationRequest = z.infer<typeof generationBody>;
export type SendAiMailDraftRequest = z.infer<typeof sendAiMailDraftSchema>['body'];
export type AiMailRewriteRequest = z.infer<typeof rewriteBody>;
