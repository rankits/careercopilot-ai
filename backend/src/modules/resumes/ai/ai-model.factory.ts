import { AppError } from '@/shared/utils/errors/AppError.js';
import { ResumeAiProviderName, StructuredAiModel } from '@/modules/resumes/ai/ai-model.contract.js';
import { getParserProfile } from '@/modules/resumes/ai/parser-profile.registry.js';
import { GeminiStructuredAiModel } from '@/modules/resumes/ai/providers/gemini/gemini-structured-ai.model.js';

const createGoogleModel = (profileName: string): StructuredAiModel => {
  const profile = getParserProfile(profileName);
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AppError('GOOGLE_API_KEY is required for the resume parser AI provider', 500);
  }

  return new GeminiStructuredAiModel({
    apiKey,
    model: profile.model,
    temperature: profile.temperature,
    maxRetries: profile.maxRetries,
  });
};

export const createAiModel = (profileName = 'resume-parser-default'): StructuredAiModel => {
  const profile = getParserProfile(profileName);

  switch (profile.provider as ResumeAiProviderName) {
    case 'google':
      return createGoogleModel(profileName);
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
