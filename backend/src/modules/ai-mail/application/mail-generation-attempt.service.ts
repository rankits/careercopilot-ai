import type {
  AiMailDraftRepository,
  CreateAiMailGenerationAttemptInput,
} from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { AiMailGenerationAttempt } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export type RecordGenerationAttemptInput = Omit<
  CreateAiMailGenerationAttemptInput,
  'userId' | 'draftId'
>;

/**
 * Internal-only, metadata-only generation ledger.
 * The input type deliberately has no fields for prompts, profile/resume context,
 * recruiter addresses, or generated content.
 */
export class MailGenerationAttemptService {
  constructor(private readonly repository: AiMailDraftRepository) {}

  async recordGenerationAttempt(
    userId: string,
    draftId: string,
    input: RecordGenerationAttemptInput,
  ): Promise<AiMailGenerationAttempt> {
    const draft = await this.repository.findByIdForUser(draftId, userId);
    if (!draft) {
      throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');
    }

    return this.repository.createAttempt({
      draftId,
      userId,
      ...input,
    });
  }
}
