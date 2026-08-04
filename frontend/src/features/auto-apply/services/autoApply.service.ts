import { httpClient } from '@/services/httpClient';

import type {
  ApplicationConsentDto,
  ApplicationPlanResult,
  ApplicationRuleDto,
  ApplicationAnswerDto,
  ApprovedResumeVersionDto,
  BackendSuccessResponse,
  CandidateApplicationProfileDto,
  ConsentType,
  CreateAnswerPayload,
  CreateResumeVersionPayload,
  EligibilityResult,
  InitiateSubmissionResult,
  JobApplicationDto,
  UpsertCandidateProfilePayload,
  UpsertRulePayload,
} from '../types/autoApply.types';

function unwrapData<T>(data: BackendSuccessResponse<T>, missingMessage: string): T {
  if (data.data === undefined || data.data === null) {
    throw new Error(missingMessage);
  }
  return data.data;
}

export const autoApplyService = {
  async getProfile(): Promise<CandidateApplicationProfileDto | null> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<CandidateApplicationProfileDto | null>>(
        '/auto-apply/profile',
      );
    return data.data ?? null;
  },

  async upsertProfile(
    payload: UpsertCandidateProfilePayload,
  ): Promise<CandidateApplicationProfileDto> {
    const { data } = await httpClient.put<BackendSuccessResponse<CandidateApplicationProfileDto>>(
      '/auto-apply/profile',
      payload,
    );
    return unwrapData(data, 'Missing profile data in API response');
  },

  async listAnswers(): Promise<ApplicationAnswerDto[]> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<ApplicationAnswerDto[]>>('/auto-apply/answers');
    return unwrapData(data, 'Missing answers data in API response');
  },

  async createAnswer(payload: CreateAnswerPayload): Promise<ApplicationAnswerDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationAnswerDto>>(
      '/auto-apply/answers',
      payload,
    );
    return unwrapData(data, 'Missing answer data in API response');
  },

  async deleteAnswer(id: string): Promise<void> {
    await httpClient.delete(`/auto-apply/answers/${id}`);
  },

  async listResumeVersions(): Promise<ApprovedResumeVersionDto[]> {
    const { data } = await httpClient.get<BackendSuccessResponse<ApprovedResumeVersionDto[]>>(
      '/auto-apply/resume-versions',
    );
    return unwrapData(data, 'Missing resume version data in API response');
  },

  async createResumeVersion(
    payload: CreateResumeVersionPayload,
  ): Promise<ApprovedResumeVersionDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApprovedResumeVersionDto>>(
      '/auto-apply/resume-versions',
      payload,
    );
    return unwrapData(data, 'Missing resume version data in API response');
  },

  async deleteResumeVersion(id: string): Promise<void> {
    await httpClient.delete(`/auto-apply/resume-versions/${id}`);
  },

  async getRule(): Promise<ApplicationRuleDto | null> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<ApplicationRuleDto | null>>('/auto-apply/rules');
    return data.data ?? null;
  },

  async upsertRule(payload: UpsertRulePayload): Promise<ApplicationRuleDto> {
    const { data } = await httpClient.put<BackendSuccessResponse<ApplicationRuleDto>>(
      '/auto-apply/rules',
      payload,
    );
    return unwrapData(data, 'Missing rule data in API response');
  },

  async pauseAutopilot(): Promise<ApplicationRuleDto> {
    const { data } =
      await httpClient.post<BackendSuccessResponse<ApplicationRuleDto>>('/auto-apply/rules/pause');
    return unwrapData(data, 'Missing rule data in API response');
  },

  async resumeAutopilot(): Promise<ApplicationRuleDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationRuleDto>>(
      '/auto-apply/rules/resume',
    );
    return unwrapData(data, 'Missing rule data in API response');
  },

  async listConsents(): Promise<ApplicationConsentDto[]> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<ApplicationConsentDto[]>>('/auto-apply/consents');
    return unwrapData(data, 'Missing consent data in API response');
  },

  async grantConsent(consentType: ConsentType): Promise<ApplicationConsentDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationConsentDto>>(
      '/auto-apply/consents',
      { consentType },
    );
    return unwrapData(data, 'Missing consent data in API response');
  },

  async revokeConsent(id: string): Promise<ApplicationConsentDto> {
    const { data } = await httpClient.delete<BackendSuccessResponse<ApplicationConsentDto>>(
      `/auto-apply/consents/${id}`,
    );
    return unwrapData(data, 'Missing consent data in API response');
  },

  async listSubmissions(): Promise<JobApplicationDto[]> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<JobApplicationDto[]>>('/auto-apply/submissions');
    return unwrapData(data, 'Missing submissions data in API response');
  },

  async initiateSubmission(jobId: string): Promise<InitiateSubmissionResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<InitiateSubmissionResult>>(
      '/auto-apply/submissions',
      { jobId },
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async withdrawSubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/withdraw`,
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async approveSubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/approve`,
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async queueSubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/queue`,
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async confirmSubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/confirm`,
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async retrySubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/retry`,
    );
    return unwrapData(data, 'Missing submission data in API response');
  },

  async checkEligibility(jobId: string): Promise<EligibilityResult> {
    const { data } = await httpClient.get<BackendSuccessResponse<EligibilityResult>>(
      `/auto-apply/eligibility/${jobId}`,
    );
    return unwrapData(data, 'Missing eligibility data in API response');
  },

  async createPlan(jobId: string): Promise<ApplicationPlanResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationPlanResult>>(
      '/auto-apply/plan',
      { jobId },
    );
    return unwrapData(data, 'Missing plan data in API response');
  },

  async getPlan(jobId: string): Promise<ApplicationPlanResult | null> {
    try {
      const { data } = await httpClient.get<BackendSuccessResponse<ApplicationPlanResult>>(
        `/auto-apply/plan/${jobId}`,
      );
      return data.data ?? null;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw error;
    }
  },
};
