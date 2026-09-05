import { createHash } from 'node:crypto';

import type {
  AiMailDraftListInput,
  AiMailDraftPage,
  AiMailDraftRepository,
  UpdateAiMailDraftInput,
} from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import { findUnresolvedPlaceholders } from '@/modules/ai-mail/domain/placeholder-detector.js';
import {
  assertMailDraftTransition,
  InvalidMailDraftTransitionError,
} from '@/modules/ai-mail/domain/draft-state-machine.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import type {
  CreateAiMailDraftRequest,
  UpdateAiMailDraftRequest,
} from '@/modules/ai-mail/validations/ai-mail.schema.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const error = {
  notFound: () => new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND'),
  versionConflict: (currentVersion: number) =>
    new AppError('AI Mail draft version conflict', 409, 'AI_MAIL_DRAFT_VERSION_CONFLICT', {
      currentVersion,
    }),
  invalidTransition: () =>
    new AppError(
      'Invalid AI Mail draft status transition',
      409,
      'AI_MAIL_INVALID_STATUS_TRANSITION',
    ),
  resumeNotFound: () => new AppError('Resume not found', 404, 'AI_MAIL_RESUME_NOT_FOUND'),
  placeholders: (placeholders: string[]) =>
    new AppError('Draft contains unresolved placeholders', 422, 'AI_MAIL_UNRESOLVED_PLACEHOLDERS', {
      placeholders: placeholders.map((value) => value.slice(0, 64)),
    }),
  notReady: () => new AppError('Draft requires a subject and body', 422, 'AI_MAIL_DRAFT_NOT_READY'),
  archived: () => new AppError('AI Mail draft is archived', 409, 'AI_MAIL_DRAFT_ARCHIVED'),
};

const HASH_FIELDS = new Set(['recruiterEmail', 'subject', 'bodyText', 'bodyHtml', 'resumeId']);
const safeUserReference = (userId: string): string =>
  createHash('sha256').update(userId).digest('hex').slice(0, 16);

export class AiMailDraftService {
  constructor(private readonly repository: AiMailDraftRepository) {}

  async create(userId: string, input: CreateAiMailDraftRequest): Promise<AiMailDraft> {
    await this.assertResumeOwnership(input.resumeId, userId);
    const draft = await this.repository.create({
      ...input,
      userId,
      status: 'input',
      userEdited: false,
    });
    this.log('create', userId, draft.id, 'success');
    return draft;
  }

  async list(userId: string, input: AiMailDraftListInput): Promise<AiMailDraftPage> {
    const page = await this.repository.listForUser(userId, input);
    this.log('list', userId, undefined, 'success');
    return page;
  }

  async get(userId: string, draftId: string): Promise<AiMailDraft> {
    const draft = await this.requireDraft(userId, draftId);
    this.log('get', userId, draftId, 'success');
    return draft;
  }

  async update(
    userId: string,
    draftId: string,
    input: UpdateAiMailDraftRequest,
  ): Promise<AiMailDraft> {
    const existing = await this.requireDraft(userId, draftId);
    this.assertMutable(existing);
    if (input.resumeId && input.resumeId !== existing.resumeId) {
      await this.assertResumeOwnership(input.resumeId, userId);
    }

    const { version, ...requestedChanges } = input;
    const changedKeys = Object.keys(requestedChanges);
    const changes: UpdateAiMailDraftInput['changes'] = {
      ...requestedChanges,
      userEdited: true,
    };
    if (existing.status === 'ready_to_send' || existing.status === 'generated') {
      this.assertTransition(existing.status, 'edited');
      changes.status = 'edited';
      changes.contentHash = null;
    }
    if (changedKeys.some((key) => HASH_FIELDS.has(key))) changes.contentHash = null;

    const updated = await this.repository.updateForUser(draftId, userId, {
      expectedVersion: version,
      changes,
    });
    if (!updated) await this.throwCasFailure(userId, draftId, version);
    this.log('update', userId, draftId, 'success');
    return updated!;
  }

  async archive(userId: string, draftId: string, version: number): Promise<AiMailDraft> {
    const existing = await this.requireDraft(userId, draftId);
    if (existing.status === 'archived') throw error.archived();
    this.assertTransition(existing.status, 'archived');
    const archived = await this.repository.archiveForUser(draftId, userId, version);
    if (!archived) await this.throwCasFailure(userId, draftId, version);
    this.log('archive', userId, draftId, 'success');
    return archived!;
  }

  async markReady(userId: string, draftId: string, version: number): Promise<AiMailDraft> {
    const existing = await this.requireDraft(userId, draftId);
    this.assertMutable(existing);
    if (!existing.subject?.trim() || !existing.bodyText?.trim()) throw error.notReady();
    const placeholders = findUnresolvedPlaceholders(
      existing.subject,
      existing.bodyText,
      existing.bodyHtml,
    );
    if (placeholders.length > 0) throw error.placeholders(placeholders);
    this.assertTransition(existing.status, 'ready_to_send');
    const nextVersion = version + 1;
    const contentHash = hashAiMailContent({
      recruiterEmail: existing.recruiterEmail,
      subject: existing.subject,
      bodyText: existing.bodyText,
      bodyHtml: existing.bodyHtml,
      resumeId: existing.resumeId,
      version: nextVersion,
    });
    const ready = await this.repository.updateForUser(draftId, userId, {
      expectedVersion: version,
      changes: { status: 'ready_to_send', contentHash },
    });
    if (!ready) await this.throwCasFailure(userId, draftId, version);
    this.log('mark_ready', userId, draftId, 'success');
    return ready!;
  }

  private async requireDraft(userId: string, draftId: string): Promise<AiMailDraft> {
    const draft = await this.repository.findByIdForUser(draftId, userId);
    if (!draft) throw error.notFound();
    return draft;
  }

  private assertMutable(draft: AiMailDraft): void {
    if (draft.status === 'archived') throw error.archived();
    if (draft.status === 'generating') throw error.invalidTransition();
  }

  private assertTransition(from: AiMailDraft['status'], to: AiMailDraft['status']): void {
    try {
      assertMailDraftTransition(from, to);
    } catch (cause) {
      if (cause instanceof InvalidMailDraftTransitionError) throw error.invalidTransition();
      throw cause;
    }
  }

  private async assertResumeOwnership(resumeId: string, userId: string): Promise<void> {
    if (!(await this.repository.resumeBelongsToUser(resumeId, userId))) {
      throw error.resumeNotFound();
    }
  }

  private async throwCasFailure(userId: string, draftId: string, expectedVersion: number) {
    const current = await this.repository.findByIdForUser(draftId, userId);
    if (!current) throw error.notFound();
    if (current.status === 'archived') throw error.archived();
    if (current.version !== expectedVersion) throw error.versionConflict(current.version);
    throw error.invalidTransition();
  }

  private log(
    operation: string,
    userId: string,
    draftId: string | undefined,
    result: 'success' | 'failure',
  ): void {
    logger.info(
      { operation, userIdHash: safeUserReference(userId), draftId, result },
      'AI Mail draft operation',
    );
  }
}
