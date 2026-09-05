import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type {
  StructuredAiExtractionRequest,
  StructuredAiModel,
} from '@/modules/resumes/ai/ai-model.contract.js';
import { extractTextContent, parseProviderJson } from '@/modules/resumes/ai/json.js';
import { buildResumeParserUserPrompt } from '@/modules/resumes/ai/prompts/resume-parser.prompt.js';

export class GeminiStructuredAiModel implements StructuredAiModel {
  constructor(
    private readonly config: {
      apiKey: string;
      model: string;
      temperature: number;
      /** LangChain-level retries; keep 0 when the outer fallback layer owns retries. */
      maxRetries: number;
    },
  ) {}

  async extract<T>(request: StructuredAiExtractionRequest<T>): Promise<T> {
    const model = new ChatGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      model: this.config.model,
      temperature: this.config.temperature,
      maxRetries: this.config.maxRetries,
    });

    const response = await model.invoke([
      {
        role: 'system',
        content: request.systemPrompt,
      },
      {
        role: 'user',
        content: buildResumeParserUserPrompt(request.documentText),
      },
    ]);

    const rawText = extractTextContent((response as { content?: unknown }).content ?? response);
    const parsed = parseProviderJson(rawText, 'Gemini');
    return request.schema.parse(parsed);
  }
}
