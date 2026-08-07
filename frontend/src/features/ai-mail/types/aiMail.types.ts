export type MailDraftStatus =
  | 'input'
  | 'generating'
  | 'generated'
  | 'edited'
  | 'generation_failed'
  | 'ready_to_send'
  | 'archived';

export type MailTone = 'professional' | 'concise' | 'warm' | 'confident' | 'formal' | 'custom';

export interface MailGenerationConstraints {
  tone: MailTone;
  customTone?: string;
  maximumWords?: number;
  includeCallToAction: boolean;
  includeResumeMention: boolean;
  emphasizeSkills: string[];
  emphasizeAchievements: string[];
  avoidTopics: string[];
  customInstructions?: string;
}

export interface AiMailDraft {
  id: string;
  userId: string;
  recruiterEmail: string;
  recruiterName?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  jobDescription: string;
  additionalContext?: string;
  resumeId: string;
  profileSnapshotId?: string;
  constraints: MailGenerationConstraints;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  status: MailDraftStatus;
  version: number;
  generatedBy?: {
    provider: string;
    model: string;
    requestId?: string;
    generatedAt: string;
  };
  userEdited: boolean;
  contentHash?: string;
  followUpToDeliveryId?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMailDraftPage {
  items: AiMailDraft[];
  page: number;
  limit: number;
  total: number;
}

export interface AiMailDraftListParams {
  page?: number;
  limit?: number;
  status?: MailDraftStatus;
  search?: string;
}

export interface CreateAiMailDraftPayload {
  recruiterEmail: string;
  recruiterName?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  jobDescription: string;
  additionalContext?: string;
  resumeId: string;
  constraints?: MailGenerationConstraints;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
}

export type UpdateAiMailDraftPayload = Partial<
  Omit<
    CreateAiMailDraftPayload,
    | 'recruiterName'
    | 'companyName'
    | 'roleTitle'
    | 'jobUrl'
    | 'additionalContext'
    | 'subject'
    | 'bodyText'
    | 'bodyHtml'
  >
> & {
  recruiterName?: string | null;
  companyName?: string | null;
  roleTitle?: string | null;
  jobUrl?: string | null;
  additionalContext?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  version: number;
};

export interface VersionedDraftPayload {
  version: number;
}

export interface BackendSuccessResponse<T> {
  data?: T;
}

export type AiMailResumeAvailability =
  'eligible' | 'needs_review' | 'processing' | 'failed' | 'not_parsed';

export interface AiMailResumeListItem {
  id: string;
  fileName: string;
  label?: string;
  uploadedAt: string;
  updatedAt: string;
  processedAt?: string;
  processingStatus: string;
  parseStatus?: string;
  availability: AiMailResumeAvailability;
  eligibleForAiMail: boolean;
  ineligibleReason?: string;
  isPrimary: boolean;
  warning?: string;
}

export interface AiMailResumeListDto {
  items: AiMailResumeListItem[];
  primaryResumeId?: string;
}

export interface AiMailProfileSummaryDto {
  exists: boolean;
  confirmed: boolean;
  candidateName?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  topSkills: string[];
  fullNamePresent: boolean;
  currentRolePresent: boolean;
  locationPresent: boolean;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  certificationCount: number;
  achievementCount: number;
  professionalLinkCount: number;
  completenessPercent: number;
  missingRecommendedSections: string[];
}

export interface AiMailReadinessIssue {
  code: string;
  message: string;
  field?: string;
}

export interface AiMailGenerationReadinessDto {
  ready: boolean;
  blockers: AiMailReadinessIssue[];
  warnings: AiMailReadinessIssue[];
  resume?: AiMailResumeListItem;
  profile: AiMailProfileSummaryDto;
  detectedJobMetadata: {
    roleTitle?: string;
    companyName?: string;
    recruiterName?: string;
  };
  suggestedJobMetadata: {
    roleTitle?: string;
    companyName?: string;
  };
  counts: {
    profileSkills: number;
    resumeSkills: number;
    experienceEntries: number;
    jobRequirements: number;
    jobResponsibilities: number;
    jobKeywords: number;
  };
  contextHash?: string;
}

export interface AiMailFeatureConfig {
  enabled: boolean;
  saveDraftsEnabled: boolean;
  partialRewriteEnabled: boolean;
  provider: string;
  limits: {
    maxJobDescriptionCharacters: number;
    maxAdditionalContextCharacters: number;
  };
  phase2: {
    gmailIntegrationEnabled: boolean;
    mailSendingEnabled: boolean;
  };
}

export type MailDeliveryStatus =
  'pending' | 'sending' | 'sent' | 'failed' | 'unknown' | 'cancelled';

export type DuplicateSendLevel = 'none' | 'info' | 'warning' | 'hard_block';

export interface DuplicateSendAssessment {
  level: DuplicateSendLevel;
  reason?: string;
  previousDelivery?: {
    deliveryId: string;
    sentAt: string;
    draftId: string;
  };
}

export interface AiMailSendLimits {
  hourly: { used: number; limit: number };
  daily: { used: number; limit: number };
}

export interface AiMailSendPreview {
  draftId: string;
  version: number;
  contentHash: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  fromEmail: string;
  connectedAccountId: number;
  accountStatus: string;
  resumeId: string;
  resumeFileName?: string;
  resumeSizeBytes?: number;
  mailSendingEnabled: boolean;
  gmailIntegrationEnabled: boolean;
  canSend: boolean;
  blockers: string[];
  duplicateAssessment: DuplicateSendAssessment;
  limits: AiMailSendLimits;
}

export interface AiMailSendPayload {
  version: number;
  contentHash: string;
  connectedAccountId: number;
  idempotencyKey: string;
}

export interface AiMailDeliveryResult {
  deliveryId: string;
  draftId: string;
  status: MailDeliveryStatus;
  providerMessageId?: string;
  providerThreadId?: string;
  fromEmail: string;
  recipientEmail: string;
  sentAt?: string;
  normalizedErrorCode?: string;
  idempotentReplay: boolean;
}

export interface AiMailDeliveryListItem {
  deliveryId: string;
  draftId: string;
  draftVersion: number;
  status: MailDeliveryStatus;
  userResolution?: 'confirmed_sent' | 'confirmed_not_sent';
  userResolvedAt?: string;
  provider: string;
  recipientEmail: string;
  fromEmail: string;
  subject?: string;
  companyName?: string;
  roleTitle?: string;
  resumeId: string;
  connectedAccountId: number;
  connectedAccountEmail?: string;
  connectedAccountDisconnected: boolean;
  providerMessageId?: string;
  providerThreadId?: string;
  normalizedErrorCode?: string;
  attemptedAt: string;
  sentAt?: string;
  createdAt: string;
}

export interface AiMailDeliveryPage {
  items: AiMailDeliveryListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface AiMailDeliveryListParams {
  page?: number;
  limit?: number;
  status?: MailDeliveryStatus;
  draftId?: string;
  company?: string;
  role?: string;
  connectedAccountId?: number;
  from?: string;
  to?: string;
}

export interface PrepareFollowUpPayload {
  style?: 'concise' | 'polite' | 'value_add' | 'check_in';
  additionalInstruction?: string;
}

export interface PrepareFollowUpResult {
  draft: AiMailDraft;
  warnings: string[];
  suggestedFollowUpWindow: string;
}

export const DEFAULT_MAIL_GENERATION_CONSTRAINTS: Readonly<MailGenerationConstraints> = {
  tone: 'professional',
  maximumWords: 250,
  includeCallToAction: true,
  includeResumeMention: true,
  emphasizeSkills: [],
  emphasizeAchievements: [],
  avoidTopics: ['salary expectations'],
};

export const DEFAULT_AI_MAIL_JD_LIMIT = 20_000;

export type MailGenerationOperation =
  | 'generate_full'
  | 'regenerate_full'
  | 'generate_subject'
  | 'generate_follow_up'
  | 'rewrite_tone'
  | 'shorten'
  | 'expand'
  | 'fix_grammar'
  | 'rewrite_selection';

export type AiMailRevisionSource = 'ai_generated' | 'ai_regenerated' | 'user_saved' | 'restored';

export interface GenerationWarning {
  code: string;
  message: string;
  field?: 'subject' | 'bodyText' | 'bodyHtml';
}

export interface HighlightedQualification {
  claim: string;
  evidenceCategory: string;
}

export interface GeneratedMailOutput {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  detectedContext: {
    roleTitle?: string;
    companyName?: string;
    recruiterName?: string;
  };
  highlightedQualifications: HighlightedQualification[];
  warnings: GenerationWarning[];
}

export interface AiMailGenerationPayload {
  version: number;
  idempotencyKey?: string;
  confirmOverwriteUserEdits?: boolean;
}

export interface AiMailRewritePayload extends AiMailGenerationPayload {
  operation: Exclude<
    MailGenerationOperation,
    'generate_full' | 'regenerate_full' | 'generate_subject'
  >;
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

export interface AiMailDraftRevision {
  id: string;
  draftId: string;
  draftVersion: number;
  revisionNumber: number;
  source: AiMailRevisionSource;
  operation?: MailGenerationOperation;
  subject?: string;
  bodyText?: string;
  contextHash?: string;
  promptVersion?: string;
  providerName?: string;
  providerModel?: string;
  createdAt: string;
}
