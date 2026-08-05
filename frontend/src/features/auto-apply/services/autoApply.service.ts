import { httpClient } from '@/services/httpClient';

import type {
  ApplicationConsentDto,
  ApplicationPageAnalysisDto,
  ApplicationPlanResult,
  ApplicationRuleDto,
  ApplicationAnswerDto,
  ApprovedResumeVersionDto,
  BackendSuccessResponse,
  CandidateApplicationProfileDto,
  ConsentType,
  CreateAnswerPayload,
  CreateResumeVersionPayload,
  DeleteResumeVersionResult,
  EligibilityResult,
  InitiateSubmissionResult,
  JobApplicationDto,
  PrepareApplicationPayload,
  PrepareApplicationResult,
  PrivacyAcknowledgementDto,
  PrivacyAcknowledgementPayload,
  SetupStatusDto,
  AssistedApplyWorkspaceDto,
  WorkspaceStepId,
  UpdateResumeVersionPayload,
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

  async updateAnswer(
    id: string,
    payload: Partial<Pick<CreateAnswerPayload, 'answer' | 'autoSubmitAllowed'>>,
  ): Promise<ApplicationAnswerDto> {
    const { data } = await httpClient.patch<BackendSuccessResponse<ApplicationAnswerDto>>(
      `/auto-apply/answers/${id}`,
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

  async updateResumeVersion(
    id: string,
    payload: UpdateResumeVersionPayload,
  ): Promise<ApprovedResumeVersionDto> {
    const { data } = await httpClient.patch<BackendSuccessResponse<ApprovedResumeVersionDto>>(
      `/auto-apply/resume-versions/${id}`,
      payload,
    );
    return unwrapData(data, 'Missing resume version data in API response');
  },

  async deleteResumeVersion(id: string): Promise<DeleteResumeVersionResult> {
    const { data } = await httpClient.delete<BackendSuccessResponse<DeleteResumeVersionResult>>(
      `/auto-apply/resume-versions/${id}`,
    );
    return unwrapData(data, 'Missing delete resume version data in API response');
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

  async deleteSubmission(id: string): Promise<void> {
    await httpClient.delete(`/auto-apply/submissions/${id}`);
  },

  async reopenSubmission(id: string): Promise<JobApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<JobApplicationDto>>(
      `/auto-apply/submissions/${id}/reopen`,
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

  async prepareApplication(
    jobId: string,
    payload: PrepareApplicationPayload = {},
  ): Promise<PrepareApplicationResult> {
    const { data } = await httpClient.post<BackendSuccessResponse<PrepareApplicationResult>>(
      `/auto-apply/jobs/${jobId}/prepare`,
      {
        applyMode: payload.applyMode ?? 'PREPARE',
        jobApplicationId: payload.jobApplicationId,
        resumeVersionId: payload.resumeVersionId,
        allowMatchCompute: payload.allowMatchCompute,
        forceRefreshAnalysis: payload.forceRefreshAnalysis,
      },
    );
    return unwrapData(data, 'Missing prepare-application data in API response');
  },

  async analyzeJobPage(
    jobId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<ApplicationPageAnalysisDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationPageAnalysisDto>>(
      `/auto-apply/jobs/${jobId}/analysis`,
      { forceRefresh: options?.forceRefresh === true },
    );
    return unwrapData(data, 'Missing job analysis data in API response');
  },

  async getLatestJobAnalysis(jobId: string): Promise<ApplicationPageAnalysisDto | null> {
    try {
      const { data } = await httpClient.get<
        BackendSuccessResponse<ApplicationPageAnalysisDto | null>
      >(`/auto-apply/jobs/${jobId}/analysis/latest`);
      return data.data ?? null;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw error;
    }
  },

  async getSetupStatus(): Promise<SetupStatusDto> {
    const { data } =
      await httpClient.get<BackendSuccessResponse<SetupStatusDto>>('/auto-apply/setup-status');
    return unwrapData(data, 'Missing setup-status data in API response');
  },

  async getPrivacyAcknowledgement(): Promise<PrivacyAcknowledgementDto | null> {
    const { data } = await httpClient.get<BackendSuccessResponse<PrivacyAcknowledgementDto | null>>(
      '/auto-apply/privacy-acknowledgement',
    );
    return data.data ?? null;
  },

  async savePrivacyAcknowledgement(
    payload: PrivacyAcknowledgementPayload,
  ): Promise<PrivacyAcknowledgementDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<PrivacyAcknowledgementDto>>(
      '/auto-apply/privacy-acknowledgement',
      payload,
    );
    return unwrapData(data, 'Missing privacy acknowledgement data in API response');
  },

  async getAssistedApplyWorkspace(
    jobApplicationId: string,
  ): Promise<AssistedApplyWorkspaceDto> {
    const { data } = await httpClient.get<BackendSuccessResponse<AssistedApplyWorkspaceDto>>(
      `/auto-apply/submissions/${jobApplicationId}/workspace`,
    );
    return unwrapData(data, 'Missing Assisted Apply workspace data in API response');
  },

  async updateWorkspaceProgressStep(
    jobApplicationId: string,
    progressStep: WorkspaceStepId,
  ): Promise<{ progressStep: WorkspaceStepId }> {
    const { data } = await httpClient.patch<
      BackendSuccessResponse<{ progressStep: WorkspaceStepId }>
    >(`/auto-apply/submissions/${jobApplicationId}/progress-step`, { progressStep });
    return unwrapData(data, 'Missing progress-step data in API response');
  },
};
