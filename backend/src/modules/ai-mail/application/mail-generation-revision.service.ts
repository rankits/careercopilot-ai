import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type {
  AiMailDraft,
  AiMailDraftRevision,
  AiMailRevisionSource,
  MailGenerationOperation,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { aiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface CreateRevisionInput {
  draftId: string;
  userId: string;
  draftVersion: number;
  source: AiMailRevisionSource;
  operation?: MailGenerationOperation;
  subject?: string;
  bodyText?: string;
  contextHash?: string;
  promptVersion?: string;
  providerName?: string;
  providerModel?: string;
}

export class MailGenerationRevisionService {
  constructor(private readonly repository: AiMailDraftRepository) {}

  list(userId: string, draftId: string): Promise<AiMailDraftRevision[]> {
    return this.repository.listRevisionsForDraft(draftId, userId);
  }

  async create(input: CreateRevisionInput): Promise<AiMailDraftRevision> {
    const count = await this.repository.countRevisionsForDraft(input.draftId);
    if (count >= aiMailConfig.maxRevisionsPerDraft) {
      throw new AppError(
        'Revision limit reached for draft',
        409,
        'AI_MAIL_REVISION_LIMIT_REACHED',
        {
          maxRevisions: aiMailConfig.maxRevisionsPerDraft,
        },
      );
    }
    return this.repository.createRevision(input);
  }

  async restore(
    userId: string,
    draftId: string,
    revisionId: string,
    expectedVersion: number,
  ): Promise<AiMailDraft> {
    const revision = await this.repository.findRevisionForUser(revisionId, draftId, userId);
    if (!revision) {
      throw new AppError('AI Mail revision not found', 404, 'AI_MAIL_REVISION_NOT_FOUND');
    }

    const updated = await this.repository.updateForUser(draftId, userId, {
      expectedVersion,
      changes: {
        subject: revision.subject ?? null,
        bodyText: revision.bodyText ?? null,
        status: 'edited',
        userEdited: true,
        contentHash: null,
        lastContextHash: revision.contextHash ?? null,
      },
    });
    if (!updated) {
      throw new AppError('AI Mail draft version conflict', 409, 'AI_MAIL_DRAFT_VERSION_CONFLICT');
    }

    await this.create({
      draftId,
      userId,
      draftVersion: updated.version,
      source: 'restored',
      operation: revision.operation,
      subject: revision.subject,
      bodyText: revision.bodyText,
      contextHash: revision.contextHash,
      promptVersion: revision.promptVersion,
      providerName: revision.providerName,
      providerModel: revision.providerModel,
    });

    return updated;
  }
}
