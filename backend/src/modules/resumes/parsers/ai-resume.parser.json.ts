import { parseProviderJson } from '@/modules/resumes/ai/json.js';

/**
 * Coerces an AI model response into a parsed object.
 * Strings are JSON-parsed (with fence stripping); objects pass through.
 */
export const parseAiResumeModelResponse = (response: unknown): unknown => {
  if (typeof response === 'string') {
    return parseProviderJson(response, 'resume-parser');
  }

  return response;
};
