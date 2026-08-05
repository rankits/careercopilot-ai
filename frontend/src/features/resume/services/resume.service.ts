import axios from 'axios';

import type {
  CandidateProfileData,
  ConfirmProfileInput,
  ResumeParseCallbacks,
  ResumeParseProgress,
  ResumeParseStatus,
  ResumeProcessingStatus,
  UpdateCandidateProfilePayload,
  UploadedResumeVersion,
} from '@/features/resume/types/resume.types';
import { httpClient } from '@/services/httpClient';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 80;
const TERMINAL_PARSE_STATUSES = new Set<ResumeParseStatus>(['COMPLETED', 'NEEDS_REVIEW', 'FAILED']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const responseData = (response: unknown): Record<string, unknown> | null => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) return null;
  return response.data.data;
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const normalizeError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new Error('The request timed out. Please check your connection and try again.');
    }
    if (!error.response) {
      return new Error('Unable to reach the resume service. Check your connection and try again.');
    }
    const payload: unknown = error.response.data;
    if (isRecord(payload) && typeof payload.message === 'string') {
      return new Error(payload.message);
    }
    if (error.response.status >= 500) {
      return new Error('The resume service is temporarily unavailable. Please try again.');
    }
  }
  if (isRecord(error) && error.code === 'ECONNABORTED')
    return new Error('Resume upload timed out.');
  return error instanceof Error ? error : new Error('Unable to parse the resume.');
};

const parseStatus = (value: Record<string, unknown> | null): ResumeParseProgress | null => {
  if (
    !value ||
    typeof value.status !== 'string' ||
    typeof value.currentStep !== 'string' ||
    typeof value.progress !== 'number'
  ) {
    return null;
  }

  return {
    currentStep: value.currentStep as ResumeParseStatus,
    progress: Math.min(100, Math.max(0, value.progress)),
    requiresReview: value.requiresReview === true,
    status: value.status as ResumeParseStatus,
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
  };
};

const resolveCallbacks = (callbacks?: ResumeParseCallbacks | (() => void)): ResumeParseCallbacks =>
  typeof callbacks === 'function' ? { onParsing: callbacks } : (callbacks ?? {});

export interface CandidateProfileStatus {
  confirmedAt: string | null;
  isComplete: boolean;
  sourceResumeId: string | null;
  userId: string;
}

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const toCandidateProfileData = (data: Record<string, unknown>): CandidateProfileData => ({
  certifications: toRecordArray(data.certifications),
  education: toRecordArray(data.education),
  experience: toRecordArray(data.experience),
  isComplete: data.isComplete === true,
  personalDetails: isRecord(data.personalDetails) ? data.personalDetails : {},
  skills: toStringArray(data.skills),
  sourceResumeId: typeof data.sourceResumeId === 'string' ? data.sourceResumeId : null,
  userId: typeof data.userId === 'string' ? data.userId : '',
});

export const resumeService = {
  async parse(
    file: File,
    callbackInput?: ResumeParseCallbacks | (() => void),
  ): Promise<Record<string, unknown>> {
    const callbacks = resolveCallbacks(callbackInput);
    try {
      const payload = new FormData();
      payload.append('resume', file);
      const uploadConfig = {
        headers: { 'Content-Type': 'multipart/form-data' },
        ...(callbacks.onUploadProgress
          ? {
              onUploadProgress: ({ loaded, total }: { loaded: number; total?: number }) => {
                if (total) callbacks.onUploadProgress?.(Math.round((loaded / total) * 100));
              },
            }
          : {}),
      };
      const uploadResponse = await httpClient.post('/resumes/upload', payload, uploadConfig);
      const upload = responseData(uploadResponse);
      if (!upload || typeof upload.id !== 'string') {
        throw new Error('Resume parser returned an invalid upload response.');
      }
      callbacks.onUploaded?.(upload.id);
      callbacks.onUploadProgress?.(100);
      callbacks.onParsing?.();

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        const resumeStatusResponse = await httpClient.get(`/resumes/${upload.id}/status`);
        const statusData = responseData(resumeStatusResponse);
        const status = statusData?.status as ResumeProcessingStatus | undefined;
        const parseStatusResponse =
          status === 'UPLOADED' || status === 'PROCESSING'
            ? await httpClient.get(`/resumes/${upload.id}/parse-status`).catch(() => null)
            : null;
        const detailedStatus = parseStatus(
          parseStatusResponse ? responseData(parseStatusResponse) : null,
        );
        if (detailedStatus) callbacks.onProgress?.(detailedStatus);

        if (status === 'FAILED' || detailedStatus?.status === 'FAILED') {
          throw new Error(
            typeof statusData?.failureReason === 'string'
              ? statusData.failureReason
              : 'Resume parsing failed.',
          );
        }

        if (
          status === 'PROCESSED' ||
          (detailedStatus && TERMINAL_PARSE_STATUSES.has(detailedStatus.status))
        ) {
          const parsedResponse = await httpClient.get(`/resumes/${upload.id}/parsed-data`);
          const parsedPayload = responseData(parsedResponse);
          const parsed = parsedPayload?.extractedData;
          if (!isRecord(parsed) || Object.keys(parsed).length === 0) {
            throw new Error('Resume parser returned an empty response.');
          }
          callbacks.onMetadata?.({
            confidenceScore:
              typeof parsedPayload?.confidenceScore === 'number'
                ? parsedPayload.confidenceScore
                : null,
            extractedData: parsed,
          });
          return parsed;
        }

        await delay(POLL_INTERVAL_MS);
      }

      throw new Error('Resume parsing timed out.');
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getProfileStatus(userId: string): Promise<CandidateProfileStatus> {
    try {
      const response = await httpClient.get(`/resumes/profiles/${userId}`);
      const data = responseData(response);
      if (!data || typeof data.userId !== 'string') {
        throw new Error('Profile status returned an invalid response.');
      }

      return {
        confirmedAt: typeof data.confirmedAt === 'string' ? data.confirmedAt : null,
        isComplete: data.isComplete === true || Boolean(data.confirmedAt),
        sourceResumeId: typeof data.sourceResumeId === 'string' ? data.sourceResumeId : null,
        userId: data.userId,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          confirmedAt: null,
          isComplete: false,
          sourceResumeId: null,
          userId,
        };
      }
      throw normalizeError(error);
    }
  },

  async confirmProfile({
    resumeId,
    userId,
    ...profile
  }: ConfirmProfileInput): Promise<{ message: string }> {
    try {
      const response = await httpClient.post<{ message?: string }>(`/resumes/profile/${userId}`, {
        resumeId,
        ...profile,
      });
      return {
        message:
          typeof response.data.message === 'string' && response.data.message.length > 0
            ? response.data.message
            : 'Profile created successfully',
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getMyProfile(): Promise<CandidateProfileData | null> {
    try {
      const response = await httpClient.get('/resumes/profile/me');
      const data = responseData(response);
      return data ? toCandidateProfileData(data) : null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw normalizeError(error);
    }
  },

  async updateProfile(
    payload: UpdateCandidateProfilePayload,
  ): Promise<{ message: string; profile: CandidateProfileData }> {
    try {
      const response = await httpClient.patch<{ message?: string }>('/resumes/profile/me', payload);
      const data = responseData(response);
      if (!data) throw new Error('Profile update returned an invalid response.');
      return {
        message:
          typeof response.data.message === 'string' && response.data.message.length > 0
            ? response.data.message
            : 'Profile updated successfully',
        profile: toCandidateProfileData(data),
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async listResumes(): Promise<UploadedResumeVersion[]> {
    try {
      const response = await httpClient.get('/resumes');
      const data = isRecord(response.data) ? response.data.data : null;
      if (!Array.isArray(data)) return [];

      return data.flatMap((item, index, all) => {
        if (!isRecord(item) || typeof item.id !== 'string') return [];
        return [
          {
            id: item.id,
            mimeType:
              typeof item.mimeType === 'string' ? item.mimeType : 'application/octet-stream',
            originalName: typeof item.originalName === 'string' ? item.originalName : 'resume.pdf',
            processedAt: typeof item.processedAt === 'string' ? item.processedAt : null,
            sizeBytes: typeof item.sizeBytes === 'number' ? item.sizeBytes : 0,
            status: typeof item.status === 'string' ? item.status : 'UPLOADED',
            uploadedAt:
              typeof item.uploadedAt === 'string' ? item.uploadedAt : new Date(0).toISOString(),
            version: typeof item.version === 'number' ? item.version : all.length - index,
          },
        ];
      });
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async downloadResume(resumeId: string, fileName: string): Promise<void> {
    try {
      const response = await httpClient.get<Blob>(`/resumes/${resumeId}/download`, {
        responseType: 'blob',
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || 'resume.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
