import type {
  StructuredAiExtractionRequest,
  StructuredAiModel,
} from '@/modules/resumes/ai/ai-model.contract.js';
import {
  FRIENDLY_RESUME_PARSE_ERROR,
  isRetryableAiError,
  type ResumeAiProviderId,
} from '@/modules/resumes/ai/types.js';
import { jobsLogger } from '@/shared/utils/logger.js';

const RETRY_DELAY_MS = 2000;

export interface ResumeParserProviders {
  gemini: StructuredAiModel;
  openrouter: StructuredAiModel;
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const logParseEvent = (
  event: string,
  details: {
    provider?: ResumeAiProviderId;
    attempt?: number;
    durationMs?: number;
    reason?: string;
  },
) => {
  jobsLogger.info(
    {
      scope: 'resume-ai',
      event,
      ...details,
    },
    `[resume-ai] ${event}`,
  );
};

const tryProvider = async <T>(
  provider: ResumeAiProviderId,
  model: StructuredAiModel,
  request: StructuredAiExtractionRequest<T>,
  attempt: number,
): Promise<T> => {
  const startedAt = Date.now();
  logParseEvent('provider_selected', { provider, attempt });

  try {
    const result = await model.extract(request);
    logParseEvent('provider_success', {
      provider,
      attempt,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logParseEvent('provider_failed', {
      provider,
      attempt,
      durationMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.message : 'unknown error',
    });
    throw error;
  }
};

/**
 * Gemini primary → one retry on transient errors → OpenRouter fallback.
 * Always throws a single friendly error when both providers fail.
 */
export const parseResumeWithFallback = async <T>(
  request: StructuredAiExtractionRequest<T>,
  providers: ResumeParserProviders,
): Promise<T> => {
  const overallStartedAt = Date.now();

  try {
    const first = await tryProvider('gemini', providers.gemini, request, 1);
    logParseEvent('final_provider', {
      provider: 'gemini',
      durationMs: Date.now() - overallStartedAt,
    });
    return first;
  } catch (firstError) {
    if (isRetryableAiError(firstError)) {
      logParseEvent('retry_attempt', { provider: 'gemini', attempt: 2 });
      await delay(RETRY_DELAY_MS);

      try {
        const retry = await tryProvider('gemini', providers.gemini, request, 2);
        logParseEvent('final_provider', {
          provider: 'gemini',
          durationMs: Date.now() - overallStartedAt,
        });
        return retry;
      } catch (retryError) {
        logParseEvent('fallback_triggered', {
          provider: 'openrouter',
          reason: retryError instanceof Error ? retryError.message : 'gemini retry failed',
        });
      }
    } else {
      logParseEvent('fallback_triggered', {
        provider: 'openrouter',
        reason: firstError instanceof Error ? firstError.message : 'gemini failed',
      });
    }
  }

  try {
    const fallback = await tryProvider('openrouter', providers.openrouter, request, 1);
    logParseEvent('final_provider', {
      provider: 'openrouter',
      durationMs: Date.now() - overallStartedAt,
    });
    return fallback;
  } catch {
    logParseEvent('all_providers_failed', {
      durationMs: Date.now() - overallStartedAt,
    });
    throw new Error(FRIENDLY_RESUME_PARSE_ERROR);
  }
};
