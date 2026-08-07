import { httpClient } from '@/services/httpClient';

import type {
  AiMailDraft,
  AiMailDraftListParams,
  AiMailDraftPage,
  AiMailDraftRevision,
  AiMailFeatureConfig,
  AiMailGenerationPayload,
  AiMailGenerationReadinessDto,
  AiMailGenerationResult,
  AiMailProfileSummaryDto,
  AiMailResumeListDto,
  AiMailRewritePayload,
  BackendSuccessResponse,
  CreateAiMailDraftPayload,
  UpdateAiMailDraftPayload,
  VersionedDraftPayload,
  AiMailSendPayload,
  AiMailSendPreview,
  AiMailDeliveryResult,
  AiMailDeliveryListItem,
  AiMailDeliveryListParams,
  AiMailDeliveryPage,
  AiMailSendLimits,
  PrepareFollowUpPayload,
  PrepareFollowUpResult,
} from '../types/aiMail.types';

function unwrapData<T>(response: BackendSuccessResponse<T>, missingMessage: string): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(missingMessage);
  }
  return response.data;
}

export const aiMailService = {
  async getConfig(): Promise<AiMailFeatureConfig> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<AiMailFeatureConfig>>('/ai-mail/config');
    return unwrapData(data, 'Missing AI Mail configuration in API response');
  },

  async listResumes(): Promise<AiMailResumeListDto> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<AiMailResumeListDto>>('/ai-mail/resumes');
    return unwrapData(data, 'Missing AI Mail resumes data in API response');
  },

  async getProfileSummary(): Promise<AiMailProfileSummaryDto> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailProfileSummaryDto>>(
      '/ai-mail/profile-summary',
    );
    return unwrapData(data, 'Missing AI Mail profile summary in API response');
  },

  async getGenerationReadiness(draftId: string): Promise<AiMailGenerationReadinessDto> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailGenerationReadinessDto>>(
      `/ai-mail/drafts/${draftId}/generation-readiness`,
    );
    return unwrapData(data, 'Missing AI Mail generation readiness in API response');
  },

  async listDrafts(params: AiMailDraftListParams = {}): Promise<AiMailDraftPage> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDraftPage>>(
      '/ai-mail/drafts',
      { params },
    );
    return unwrapData(data, 'Missing AI Mail drafts data in API response');
  },

  async createDraft(payload: CreateAiMailDraftPayload): Promise<AiMailDraft> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailDraft>>(
      '/ai-mail/drafts',
      payload,
    );
    return unwrapData(data, 'Missing AI Mail draft data in API response');
  },

  async getDraft(draftId: string): Promise<AiMailDraft> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDraft>>(
      `/ai-mail/drafts/${draftId}`,
    );
    return unwrapData(data, 'Missing AI Mail draft data in API response');
  },

  async updateDraft(draftId: string, payload: UpdateAiMailDraftPayload): Promise<AiMailDraft> {
    const { data } = await httpClient.patch<BackendSuccessResponse<AiMailDraft>>(
      `/ai-mail/drafts/${draftId}`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail draft data in API response');
  },

  async archiveDraft(draftId: string, payload: VersionedDraftPayload): Promise<AiMailDraft> {
    const { data } = await httpClient.delete<BackendSuccessResponse<AiMailDraft>>(
      `/ai-mail/drafts/${draftId}`,
      { data: payload },
    );
    return unwrapData(data, 'Missing archived AI Mail draft data in API response');
  },

  async markReady(draftId: string, payload: VersionedDraftPayload): Promise<AiMailDraft> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailDraft>>(
      `/ai-mail/drafts/${draftId}/mark-ready`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail draft data in API response');
  },

  async generateDraft(
    draftId: string,
    payload: AiMailGenerationPayload,
  ): Promise<AiMailGenerationResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailGenerationResult>>(
      `/ai-mail/drafts/${draftId}/generate`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail generation result in API response');
  },

  async regenerateDraft(
    draftId: string,
    payload: AiMailGenerationPayload,
  ): Promise<AiMailGenerationResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailGenerationResult>>(
      `/ai-mail/drafts/${draftId}/regenerate`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail regeneration result in API response');
  },

  async rewriteDraft(
    draftId: string,
    payload: AiMailRewritePayload,
  ): Promise<AiMailGenerationResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailGenerationResult>>(
      `/ai-mail/drafts/${draftId}/rewrite`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail rewrite result in API response');
  },

  async generateSubject(
    draftId: string,
    payload: AiMailGenerationPayload,
  ): Promise<AiMailGenerationResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailGenerationResult>>(
      `/ai-mail/drafts/${draftId}/generate-subject`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail subject generation result in API response');
  },

  async listRevisions(draftId: string): Promise<AiMailDraftRevision[]> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDraftRevision[]>>(
      `/ai-mail/drafts/${draftId}/revisions`,
    );
    return unwrapData(data, 'Missing AI Mail draft revisions in API response');
  },

  async restoreRevision(
    draftId: string,
    revisionId: string,
    payload: VersionedDraftPayload,
  ): Promise<AiMailDraft> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailDraft>>(
      `/ai-mail/drafts/${draftId}/revisions/${revisionId}/restore`,
      payload,
    );
    return unwrapData(data, 'Missing restored AI Mail draft data in API response');
  },

  async sendPreview(draftId: string, connectedAccountId: number): Promise<AiMailSendPreview> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailSendPreview>>(
      `/ai-mail/drafts/${draftId}/send-preview`,
      { params: { connectedAccountId } },
    );
    return unwrapData(data, 'Missing AI Mail send preview in API response');
  },

  async sendDraft(draftId: string, payload: AiMailSendPayload): Promise<AiMailDeliveryResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailDeliveryResult>>(
      `/ai-mail/drafts/${draftId}/send`,
      payload,
    );
    return unwrapData(data, 'Missing AI Mail delivery result in API response');
  },

  async listDeliveries(params: AiMailDeliveryListParams = {}): Promise<AiMailDeliveryPage> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDeliveryPage>>(
      '/ai-mail/deliveries',
      { params },
    );
    return unwrapData(data, 'Missing AI Mail deliveries in API response');
  },

  async getDelivery(deliveryId: string): Promise<AiMailDeliveryListItem> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDeliveryListItem>>(
      `/ai-mail/deliveries/${deliveryId}`,
    );
    return unwrapData(data, 'Missing AI Mail delivery in API response');
  },

  async listDraftDeliveries(draftId: string): Promise<AiMailDeliveryListItem[]> {
    const { data } = await httpClient.get<BackendSuccessResponse<AiMailDeliveryListItem[]>>(
      `/ai-mail/drafts/${draftId}/deliveries`,
    );
    return unwrapData(data, 'Missing draft deliveries in API response');
  },

  async resolveDeliveryStatus(
    deliveryId: string,
    resolution: 'confirmed_sent' | 'confirmed_not_sent',
  ): Promise<AiMailDeliveryListItem> {
    const { data } = await httpClient.post<BackendSuccessResponse<AiMailDeliveryListItem>>(
      `/ai-mail/deliveries/${deliveryId}/resolve-status`,
      { resolution },
    );
    return unwrapData(data, 'Missing resolved delivery in API response');
  },

  async prepareFollowUp(
    deliveryId: string,
    payload: PrepareFollowUpPayload = {},
  ): Promise<PrepareFollowUpResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<PrepareFollowUpResult>>(
      `/ai-mail/deliveries/${deliveryId}/prepare-follow-up`,
      payload,
    );
    return unwrapData(data, 'Missing follow-up draft in API response');
  },

  async getSendLimits(): Promise<AiMailSendLimits> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<AiMailSendLimits>>('/ai-mail/send-limits');
    return unwrapData(data, 'Missing send limits in API response');
  },
};
