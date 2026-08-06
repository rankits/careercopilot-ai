import type { StructuredAiExtractionRequest } from '@/modules/resumes/ai/ai-model.contract.js';
import { RESUME_PARSER_SYSTEM_PROMPT } from '@/modules/resumes/ai/prompts/resume-parser.prompt.js';
import type { ResumeParserInput } from '@/modules/resumes/types/resume.types.js';

export {
  RESUME_PARSER_SYSTEM_PROMPT,
  buildResumeParserUserPrompt,
} from '@/modules/resumes/ai/prompts/resume-parser.prompt.js';

/**
 * Assembles the structured AI extraction request for resume parsing.
 * System and user prompts come from ai/prompts — do not duplicate prompt text here.
 * Providers build the user message via `buildResumeParserUserPrompt(documentText)`.
 */
export const buildAiResumeParseRequest = (
  input: ResumeParserInput,
): StructuredAiExtractionRequest<unknown> => ({
  systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
  documentText: input.extractedText,
  schema: {
    parse: (value: unknown) => value,
  } as never,
  metadata: {
    promptVersion: 'resume-parser-v2',
    schemaVersion: 'resume-schema-v2',
  },
});
