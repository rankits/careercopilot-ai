import { createHash } from 'node:crypto';

import type { MailGenerationProvider } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import { MailPromptBuilder } from '@/modules/ai-mail/application/mail-prompt.builder.js';
import { MailOutputParser } from '@/modules/ai-mail/application/mail-output.parser.js';
import { MailTruthfulnessValidator } from '@/modules/ai-mail/application/mail-truthfulness.validator.js';
import { MailConstraintValidator } from '@/modules/ai-mail/application/mail-constraint.validator.js';
import { MailGenerationRevisionService } from '@/modules/ai-mail/application/mail-generation-revision.service.js';
import type { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import { aiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { AI_MAIL_OUTPUT_SCHEMA_VERSION } from '@/modules/ai-mail/domain/mail-output.schema.js';
import { AI_MAIL_PROMPT_VERSION } from '@/modules/ai-mail/domain/mail-prompt-policy.js';
import {
  assertMailDraftTransition,
  InvalidMailDraftTransitionError,
} from '@/modules/ai-mail/domain/draft-state-machine.js';
import type {
  AiMailDraft,
  GeneratedMailOutput,
  MailGenerationOperation,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const REGENERATION_OPERATIONS = new Set<MailGenerationOperation>([
  'regenerate_full',
  'generate_subject',
  'generate_follow_up',
  'rewrite_tone',
  'shorten',
  'expand',
  'fix_grammar',
  'rewrite_selection',
]);

export interface AiMailGenerationRequest {
  version: number;
  idempotencyKey?: string;
  confirmOverwriteUserEdits?: boolean;
  selectedText?: string;
  rewriteInstruction?: {
    tone?: string;
    maximumWords?: number;
    instruction?: string;
  };
}

export interface AiMailGenerationResult {
  draft: AiMailDraft;
  output: GeneratedMailOutput;
  attemptId: string;
  idempotentReplay: boolean;
}

const userHash = (userId: string): string =>
  createHash('sha256').update(userId, 'utf8').digest('hex').slice(0, 16);

export class AiMailGenerationService {
  private readonly promptBuilder = new MailPromptBuilder();
  private readonly outputParser = new MailOutputParser();
  private readonly truthfulnessValidator = new MailTruthfulnessValidator();
  private readonly constraintValidator = new MailConstraintValidator();

  constructor(
    private readonly repository: AiMailDraftRepository,
    private readonly readiness: AiMailGenerationReadinessService,
    private readonly revisions: MailGenerationRevisionService,
    private readonly provider: MailGenerationProvider,
  ) {}

  async generateFull(userId: string, draftId: string, input: AiMailGenerationRequest) {
    const draft = await this.requireDraft(userId, draftId);
    const operation: MailGenerationOperation = draft.followUpToDeliveryId
      ? 'generate_follow_up'
      : 'generate_full';
    return this.execute(userId, draftId, operation, input);
  }

  regenerateFull(userId: string, draftId: string, input: AiMailGenerationRequest) {
    return this.execute(userId, draftId, 'regenerate_full', input);
  }

  generateSubject(userId: string, draftId: string, input: AiMailGenerationRequest) {
    return this.execute(userId, draftId, 'generate_subject', input);
  }

  rewrite(
    userId: string,
    draftId: string,
    operation: MailGenerationOperation,
    input: AiMailGenerationRequest,
  ) {
    if (!aiMailConfig.partialRewriteEnabled && operation === 'rewrite_selection') {
      throw new AppError('Partial rewrite is disabled', 403, 'AI_MAIL_PARTIAL_REWRITE_DISABLED');
    }
    return this.execute(userId, draftId, operation, input);
  }

  private async execute(
    userId: string,
    draftId: string,
    operation: MailGenerationOperation,
    input: AiMailGenerationRequest,
  ): Promise<AiMailGenerationResult> {
    const draft = await this.requireDraft(userId, draftId);
    this.assertMutable(draft);
    this.assertVersion(draft, input.version);

    if (draft.userEdited && !input.confirmOverwriteUserEdits) {
      throw new AppError(
        'User edits must be confirmed before overwriting generated content',
        409,
        'AI_MAIL_USER_EDITS_OVERWRITE_CONFIRMATION_REQUIRED',
      );
    }

    if (input.idempotencyKey) {
      const existing = await this.repository.findAttemptByIdempotency({
        userId,
        draftId,
        operation,
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        if (existing.status === 'started') {
          throw new AppError('Generation already in progress', 409, 'AI_MAIL_IDEMPOTENCY_CONFLICT');
        }
        if (existing.status === 'succeeded') {
          const current = await this.requireDraft(userId, draftId);
          return {
            draft: current,
            output: this.outputFromDraft(current),
            attemptId: existing.id,
            idempotentReplay: true,
          };
        }
      }
    }

    await this.assertRateLimits(userId, draftId, operation);

    const readiness = await this.readiness.evaluate(userId, draftId);
    if (!readiness.ready) {
      throw new AppError('Draft is not ready for generation', 422, 'AI_MAIL_NOT_READY', {
        blockers: readiness.blockers,
      });
    }

    const built = await this.readiness.buildGenerationContext(userId, draftId);
    const priorStatus = draft.status;
    const generating = await this.transitionToGenerating(userId, draft, input.version);
    if (!generating) {
      throw new AppError('AI Mail draft version conflict', 409, 'AI_MAIL_GENERATION_STALE', {
        currentVersion: draft.version,
      });
    }

    const promptVersion = AI_MAIL_PROMPT_VERSION;
    const outputSchemaVersion = AI_MAIL_OUTPUT_SCHEMA_VERSION;
    const prompt = this.promptBuilder.build({
      operation,
      context: built.context,
      selectedText: input.selectedText,
      rewriteInstruction: input.rewriteInstruction,
      promptVersion,
    });

    const attempt = await this.repository.createAttempt({
      draftId,
      userId,
      operation,
      status: 'started',
      providerName: this.provider.providerName,
      contextHash: built.context.contextHash,
      promptVersion,
      outputSchemaVersion,
      idempotencyKey: input.idempotencyKey,
    });

    try {
      const providerResult = await this.provider.generate({
        operation,
        promptVersion,
        outputSchemaVersion,
        context: built.context,
        prompt,
        currentDraft: {
          subject: draft.subject,
          bodyText: draft.bodyText,
        },
        selectedText: input.selectedText,
        rewriteInstruction: input.rewriteInstruction,
      });

      let parsed = this.outputParser.parse(providerResult.output, outputSchemaVersion);
      parsed = this.outputParser.sanitizeHtmlIfPresent(parsed);
      const truthful = this.truthfulnessValidator.validate(parsed, built.context, built.evidence);
      const constrained = this.constraintValidator.validate(
        truthful.output,
        built.context.constraints,
      );
      const output = constrained.output;

      const revisionSource = operation === 'generate_full' ? 'ai_generated' : 'ai_regenerated';
      const updated = await this.repository.updateForUser(draftId, userId, {
        expectedVersion: generating.version,
        changes: {
          subject: output.subject,
          bodyText: output.bodyText,
          bodyHtml: output.bodyHtml ?? null,
          status: 'generated',
          userEdited: false,
          contentHash: null,
          lastContextHash: built.context.contextHash,
          generatedBy: {
            provider: providerResult.provider,
            model: providerResult.model,
            requestId: providerResult.requestId,
            generatedAt: new Date().toISOString(),
          },
        },
      });
      if (!updated) {
        throw new AppError('AI Mail draft version conflict', 409, 'AI_MAIL_GENERATION_STALE');
      }

      await this.revisions.create({
        draftId,
        userId,
        draftVersion: updated.version,
        source: revisionSource,
        operation,
        subject: output.subject,
        bodyText: output.bodyText,
        contextHash: built.context.contextHash,
        promptVersion,
        providerName: providerResult.provider,
        providerModel: providerResult.model,
      });

      await this.repository.updateAttempt(attempt.id, {
        status: 'succeeded',
        providerModel: providerResult.model,
        providerRequestId: providerResult.requestId,
        durationMs: providerResult.durationMs,
        inputTokenCount: providerResult.usage?.inputTokenCount,
        outputTokenCount: providerResult.usage?.outputTokenCount,
        normalizedErrorCode: null,
      });

      logger.info(
        {
          userHash: userHash(userId),
          draftId,
          operation,
          attemptId: attempt.id,
          contextHash: built.context.contextHash,
        },
        'AI Mail generation succeeded',
      );

      return { draft: updated, output, attemptId: attempt.id, idempotentReplay: false };
    } catch (error) {
      const normalizedErrorCode =
        error instanceof AppError ? error.code : 'AI_MAIL_GENERATION_FAILED';

      await this.repository.updateForUser(draftId, userId, {
        expectedVersion: generating.version,
        changes: { status: 'generation_failed' },
      });

      await this.repository.updateAttempt(attempt.id, {
        status: 'failed',
        normalizedErrorCode,
      });

      logger.warn(
        {
          userHash: userHash(userId),
          draftId,
          operation,
          attemptId: attempt.id,
          priorStatus,
          errorCode: normalizedErrorCode,
        },
        'AI Mail generation failed',
      );

      throw error instanceof AppError
        ? error
        : new AppError('AI Mail generation failed', 500, 'AI_MAIL_GENERATION_FAILED');
    }
  }

  private outputFromDraft(draft: AiMailDraft): GeneratedMailOutput {
    return {
      subject: draft.subject ?? '',
      bodyText: draft.bodyText ?? '',
      bodyHtml: draft.bodyHtml,
      detectedContext: {
        roleTitle: draft.roleTitle,
        companyName: draft.companyName,
        recruiterName: draft.recruiterName,
      },
      highlightedQualifications: [],
      warnings: [],
    };
  }

  private async requireDraft(userId: string, draftId: string): Promise<AiMailDraft> {
    const draft = await this.repository.findByIdForUser(draftId, userId);
    if (!draft) throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');
    return draft;
  }

  private assertMutable(draft: AiMailDraft): void {
    if (draft.status === 'archived') {
      throw new AppError('AI Mail draft is archived', 409, 'AI_MAIL_DRAFT_ARCHIVED');
    }
    if (draft.status === 'generating') {
      throw new AppError(
        'Invalid AI Mail draft status transition',
        409,
        'AI_MAIL_INVALID_STATUS_TRANSITION',
      );
    }
  }

  private assertVersion(draft: AiMailDraft, expectedVersion: number): void {
    if (draft.version !== expectedVersion) {
      throw new AppError('AI Mail draft version is stale', 409, 'AI_MAIL_GENERATION_STALE', {
        currentVersion: draft.version,
      });
    }
  }

  private async assertRateLimits(
    userId: string,
    draftId: string,
    operation: MailGenerationOperation,
  ): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const userAttempts = await this.repository.countAttemptsForUserSince(userId, since);
    if (userAttempts >= aiMailConfig.limits.generationsPerUserPerHour) {
      throw new AppError('Generation rate limit exceeded', 429, 'AI_MAIL_GENERATION_RATE_LIMIT');
    }

    if (REGENERATION_OPERATIONS.has(operation)) {
      const regenerations = await this.repository.countRegenerationsForDraft(draftId);
      if (regenerations >= aiMailConfig.limits.regenerationsPerDraft) {
        throw new AppError(
          'Regeneration rate limit exceeded',
          429,
          'AI_MAIL_REGENERATION_RATE_LIMIT',
        );
      }
    }
  }

  private async transitionToGenerating(
    userId: string,
    draft: AiMailDraft,
    expectedVersion: number,
  ): Promise<AiMailDraft | null> {
    try {
      assertMailDraftTransition(draft.status, 'generating');
    } catch (cause) {
      if (cause instanceof InvalidMailDraftTransitionError) {
        throw new AppError(
          'Invalid AI Mail draft status transition',
          409,
          'AI_MAIL_INVALID_STATUS_TRANSITION',
        );
      }
      throw cause;
    }

    return this.repository.updateForUser(draft.id, userId, {
      expectedVersion,
      changes: { status: 'generating' },
    });
  }
}
