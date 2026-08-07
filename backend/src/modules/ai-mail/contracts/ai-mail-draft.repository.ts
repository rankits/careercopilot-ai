import type {
  AiMailDraft,
  AiMailDraftRevision,
  AiMailGenerationAttempt,
  MailDraftStatus,
} from '@/modules/ai-mail/domain/ai-mail.types.js';

export interface CreateAiMailDraftInput extends Omit<
  AiMailDraft,
  'id' | 'version' | 'createdAt' | 'updatedAt'
> {}

export interface UpdateAiMailDraftInput {
  expectedVersion: number;
  changes: {
    recruiterEmail?: string;
    recruiterName?: string | null;
    companyName?: string | null;
    roleTitle?: string | null;
    jobUrl?: string | null;
    jobDescription?: string;
    additionalContext?: string | null;
    resumeId?: string;
    constraints?: AiMailDraft['constraints'];
    subject?: string | null;
    bodyText?: string | null;
    bodyHtml?: string | null;
    status?: AiMailDraft['status'];
    generatedBy?: AiMailDraft['generatedBy'] | null;
    userEdited?: boolean;
    contentHash?: string | null;
    lastContextHash?: string | null;
    followUpToDeliveryId?: string | null;
  };
}

export interface AiMailDraftListInput {
  page: number;
  limit: number;
  status?: MailDraftStatus;
  search?: string;
}

export interface AiMailDraftPage {
  items: AiMailDraft[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateAiMailGenerationAttemptInput {
  draftId: string;
  userId: string;
  operation: string;
  status: AiMailGenerationAttempt['status'];
  providerName: string;
  providerModel?: string;
  providerRequestId?: string;
  durationMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  normalizedErrorCode?: string;
  retryCount?: number;
  contextHash?: string;
  promptVersion?: string;
  outputSchemaVersion?: string;
  idempotencyKey?: string;
}

export interface UpdateAiMailGenerationAttemptInput {
  status: AiMailGenerationAttempt['status'];
  providerModel?: string;
  providerRequestId?: string;
  durationMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  normalizedErrorCode?: string | null;
}

export interface CreateAiMailDraftRevisionInput {
  draftId: string;
  userId: string;
  draftVersion: number;
  source: AiMailDraftRevision['source'];
  operation?: AiMailDraftRevision['operation'];
  subject?: string;
  bodyText?: string;
  contextHash?: string;
  promptVersion?: string;
  providerName?: string;
  providerModel?: string;
}

export interface AiMailDraftRepository {
  create(input: CreateAiMailDraftInput): Promise<AiMailDraft>;
  findByIdForUser(draftId: string, userId: string): Promise<AiMailDraft | null>;
  listForUser(userId: string, input: AiMailDraftListInput): Promise<AiMailDraftPage>;
  updateForUser(
    draftId: string,
    userId: string,
    input: UpdateAiMailDraftInput,
  ): Promise<AiMailDraft | null>;
  archiveForUser(
    draftId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<AiMailDraft | null>;
  resumeBelongsToUser(resumeId: string, userId: string): Promise<boolean>;
  createAttempt(input: CreateAiMailGenerationAttemptInput): Promise<AiMailGenerationAttempt>;
  updateAttempt(
    attemptId: string,
    input: UpdateAiMailGenerationAttemptInput,
  ): Promise<AiMailGenerationAttempt>;
  listAttemptsForDraft(draftId: string): Promise<AiMailGenerationAttempt[]>;
  countAttemptsForUserSince(userId: string, since: Date): Promise<number>;
  countRegenerationsForDraft(draftId: string): Promise<number>;
  findAttemptByIdempotency(input: {
    userId: string;
    draftId: string;
    operation: string;
    idempotencyKey: string;
  }): Promise<AiMailGenerationAttempt | null>;
  createRevision(input: CreateAiMailDraftRevisionInput): Promise<AiMailDraftRevision>;
  listRevisionsForDraft(draftId: string, userId: string): Promise<AiMailDraftRevision[]>;
  findRevisionForUser(
    revisionId: string,
    draftId: string,
    userId: string,
  ): Promise<AiMailDraftRevision | null>;
  countRevisionsForDraft(draftId: string): Promise<number>;
}
