import axios from 'axios';

import type {
  ConfirmProfileInput,
  ResumeParseCallbacks,
  ResumeParseProgress,
  ResumeParseStatus,
  ResumeProcessingStatus,
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

  async confirmProfile({
    resumeId,
    userId,
  }: ConfirmProfileInput): Promise<Record<string, unknown>> {
    try {
      const response = await httpClient.post(`/resumes/profiles/${userId}/confirm`, { resumeId });
      const data = responseData(response);
      if (!data) throw new Error('Profile confirmation returned an invalid response.');
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
