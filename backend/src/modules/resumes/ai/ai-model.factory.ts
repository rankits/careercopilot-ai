import { AppError } from '@/shared/utils/errors/AppError.js';
import { ResumeAiProviderName, StructuredAiModel } from '@/modules/resumes/ai/ai-model.contract.js';
import { getParserProfile } from '@/modules/resumes/ai/parser-profile.registry.js';
import { GeminiStructuredAiModel } from '@/modules/resumes/ai/providers/gemini/gemini-structured-ai.model.js';
import { OpenRouterStructuredAiModel } from '@/modules/resumes/ai/providers/openrouter/openrouter.js';
import type { ResumeParserProviders } from '@/modules/resumes/ai/resumeParser.js';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';

const createGoogleModel = (): StructuredAiModel => {
  const profile = getParserProfile();
  const apiKey = resumeConfig.ai.googleApiKey;

  if (!apiKey) {
    throw new AppError('GOOGLE_API_KEY is required for the resume parser AI provider', 500);
  }

  return new GeminiStructuredAiModel({
    apiKey,
    model: profile.model,
    temperature: profile.temperature,
    // Outer fallback layer owns retries (one Gemini retry + OpenRouter).
    maxRetries: 0,
  });
};

const createOpenRouterModel = (): StructuredAiModel => {
  const { openrouter } = resumeConfig.ai;
  if (!openrouter.apiKey) {
    throw new AppError('OPENROUTER_API_KEY is required for the resume parser fallback', 500);
  }

  return new OpenRouterStructuredAiModel({
    apiKey: openrouter.apiKey,
    baseUrl: openrouter.baseUrl,
    model: openrouter.model,
    temperature: resumeConfig.ai.temperature,
    timeoutMs: openrouter.timeoutMs,
  });
};

/** Builds the primary + fallback providers used by `parseResumeWithFallback`. */
export const createResumeAiProviders = (): ResumeParserProviders => {
  const openrouterConfigured = Boolean(resumeConfig.ai.openrouter.apiKey);

  return {
    gemini: createGoogleModel(),
    openrouter: openrouterConfigured
      ? createOpenRouterModel()
      : {
          extract: async () => {
            throw new Error('OpenRouter is not configured');
          },
        },
  };
};

export const createAiModel = (profileName = 'resume-parser-default'): StructuredAiModel => {
  const profile = getParserProfile(profileName);

  switch (profile.provider as ResumeAiProviderName) {
    case 'google':
      return createGoogleModel();
    case 'openrouter':
      return createOpenRouterModel();
    case 'openai':
    case 'ollama':
      throw new AppError(
        `Resume parser provider "${profile.provider}" is not implemented yet`,
        501,
      );
    default:
      throw new AppError(`Unsupported resume parser provider: ${profile.provider}`, 501);
  }
};
