import type { OpenRouterConfig } from '@/modules/resumes/ai/providers/openrouter/openrouter.js';
import { extractTextContent } from '@/modules/resumes/ai/json.js';

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatRequest {
  messages: OpenRouterChatMessage[];
  maxTokens?: number;
  temperature?: number;
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

/**
 * Free-form chat completion against OpenRouter (no JSON schema enforcement).
 * Reuses the same OpenRouter config as the resume parser fallback.
 */
export const chatWithOpenRouter = async (
  request: OpenRouterChatRequest,
  config: OpenRouterConfig,
): Promise<string> => {
  if (!config.apiKey.trim()) {
    const error = new Error('OpenRouter is not configured') as Error & { status?: number };
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://careercopilot.app',
        'X-Title': 'CareerCopilot Career Copilot',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: request.temperature ?? Math.max(config.temperature, 0.4),
        max_tokens: request.maxTokens ?? 1500,
        messages: request.messages,
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

    const text = extractTextContent(payload?.choices?.[0]?.message?.content).trim();
    if (!text) {
      throw new Error('OpenRouter returned an empty response');
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('OpenRouter request timed out') as Error & { status?: number };
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
