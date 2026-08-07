import type { AiMailDraftListParams } from './types/aiMail.types';

export const aiMailQueryKeys = {
  all: ['ai-mail'] as const,
  config: () => ['ai-mail', 'config'] as const,
  resumes: () => ['ai-mail', 'resumes'] as const,
  profileSummary: () => ['ai-mail', 'profile-summary'] as const,
  readiness: (draftId: string) => ['ai-mail', 'readiness', draftId] as const,
  lists: () => ['ai-mail', 'drafts', 'list'] as const,
  list: (params: AiMailDraftListParams) => ['ai-mail', 'drafts', 'list', params] as const,
  details: () => ['ai-mail', 'drafts', 'detail'] as const,
  detail: (draftId: string) => ['ai-mail', 'drafts', 'detail', draftId] as const,
  revisions: (draftId: string) => ['ai-mail', 'drafts', 'revisions', draftId] as const,
  sendPreview: (draftId: string, connectedAccountId: number) =>
    ['ai-mail', 'drafts', 'send-preview', draftId, connectedAccountId] as const,
  deliveries: (params?: unknown) => ['ai-mail', 'deliveries', params ?? {}] as const,
  delivery: (deliveryId: string) => ['ai-mail', 'deliveries', 'detail', deliveryId] as const,
  draftDeliveries: (draftId: string) => ['ai-mail', 'drafts', 'deliveries', draftId] as const,
  sendLimits: () => ['ai-mail', 'send-limits'] as const,
};
