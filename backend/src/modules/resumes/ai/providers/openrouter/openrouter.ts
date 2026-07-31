import type {
  StructuredAiExtractionRequest,
  StructuredAiModel,
} from '@/modules/resumes/ai/ai-model.contract.js';
import { extractTextContent, parseProviderJson } from '@/modules/resumes/ai/json.js';
import { buildResumeParserUserPrompt } from '@/modules/resumes/ai/prompts/resume-parser.prompt.js';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  timeoutMs: number;
}

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
    code?: number | string;
  };
};

export class OpenRouterStructuredAiModel implements StructuredAiModel {
  constructor(private readonly config: OpenRouterConfig) {}

  async extract<T>(request: StructuredAiExtractionRequest<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://careercopilot.app',
          'X-Title': 'CareerCopilot Resume Parser',
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: buildResumeParserUserPrompt(request.documentText) },
          ],
        }),
      });

      const payload = (await response.json().catch(() => null)) as OpenRouterChatResponse | null;

      if (!response.ok) {
        const message =
          payload?.error?.message || `OpenRouter request failed with status ${response.status}`;
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const rawText = extractTextContent(payload?.choices?.[0]?.message?.content);
      const parsed = parseProviderJson(rawText, 'OpenRouter');

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('OpenRouter did not return a valid JSON object for the resume parser');
      }

      return request.schema.parse(parsed);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('OpenRouter request timed out') as Error & {
          status?: number;
        };
        timeoutError.status = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Convenience helper used by tests and the fallback parser. */
export const parseWithOpenRouter = async <T>(
  request: StructuredAiExtractionRequest<T>,
  config: OpenRouterConfig,
): Promise<T> => new OpenRouterStructuredAiModel(config).extract(request);
