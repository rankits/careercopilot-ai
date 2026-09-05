import type {
  MailGenerationContext,
  MailGenerationOperation,
} from '@/modules/ai-mail/domain/ai-mail.types.js';

export interface MailPromptSection {
  id:
    | 'SYSTEM_POLICY'
    | 'USER_CONSTRAINTS'
    | 'CANDIDATE_PROFILE_DATA'
    | 'SELECTED_RESUME_DATA'
    | 'JOB_DESCRIPTION_DATA'
    | 'TASK';
  content: string;
}

export interface MailPromptDocument {
  version: string;
  sections: MailPromptSection[];
}

export interface RewriteInstruction {
  tone?: string;
  maximumWords?: number;
  instruction?: string;
}

export interface GenerationOptions {
  signal?: AbortSignal;
  correlationId?: string;
}

export interface MailGenerationProviderRequest {
  operation: MailGenerationOperation;
  promptVersion: string;
  outputSchemaVersion: string;
  context: MailGenerationContext;
  prompt: MailPromptDocument;
  currentDraft?: {
    subject?: string;
    bodyText?: string;
  };
  selectedText?: string;
  rewriteInstruction?: RewriteInstruction;
}

export interface MailGenerationProviderResult {
  provider: string;
  model: string;
  requestId?: string;
  output: unknown;
  usage?: {
    inputTokenCount?: number;
    outputTokenCount?: number;
  };
  durationMs?: number;
}

export interface ProviderHealthResult {
  healthy: boolean;
  provider: string;
  checkedAt: string;
  reason?: string;
}

export interface MailGenerationProvider {
  readonly providerName: string;

  generate(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult>;

  regenerateMail(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult>;

  healthCheck(): Promise<ProviderHealthResult>;
}
