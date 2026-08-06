import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { extractJson } from '@/modules/resume-analysis/ai/json-repair.js';
import {
  isAuthOrCreditError,
  isMaxTokensAffordabilityError,
  parseAffordableMaxTokens,
} from '@/modules/resume-analysis/ai/retry.js';
import {
  resumeAnalysisConfig,
  type ResumeAnalysisAiProviderName,
} from '@/modules/resume-analysis/config/resume-analysis.config.js';

type ResumeAnalysisAiProvider = ResumeAnalysisAiProviderName;

const getAiProvider = (): ResumeAnalysisAiProvider => {
  const configuredProvider = resumeAnalysisConfig.provider.toLowerCase();

  if (configuredProvider === 'google' || configuredProvider === 'gemini') return 'google';
  if (configuredProvider === 'groq') return 'groq';
  if (configuredProvider === 'openrouter') return 'openrouter';
  if (configuredProvider === 'openai') return 'openai';

  throw new AppError(`Unsupported resume analysis AI provider: ${configuredProvider}`, 501);
};

const getGoogleApiKey = (): string | null => {
  const apiKey = resumeAnalysisConfig.googleApiKey;
  return apiKey.trim() || null;
};

/** Primary + optional rotated Groq keys (comma list or GROQ_API_KEY_2 / _FALLBACK). */
const getGroqApiKeys = (): string[] => [...resumeAnalysisConfig.groqApiKeys];

const getOpenRouterApiKey = (): string | null => {
  const apiKey = resumeAnalysisConfig.openRouterApiKey;
  return apiKey.trim() || null;
};

const getOpenAiApiKey = (): string | null => {
  const apiKey = resumeAnalysisConfig.openAiApiKey;
  return apiKey.trim() || null;
};

const providerHasCredentials = (provider: ResumeAnalysisAiProvider): boolean => {
  if (provider === 'google') return Boolean(getGoogleApiKey());
  if (provider === 'groq') return getGroqApiKeys().length > 0;
  if (provider === 'openrouter') return Boolean(getOpenRouterApiKey());
  if (provider === 'openai') return Boolean(getOpenAiApiKey());
  return false;
};

/**
 * OpenRouter first (default), then configured fallbacks (Groq / OpenAI / Google).
 * Only providers with API keys are returned.
 */
const getProviderFallbackChain = (): ResumeAnalysisAiProvider[] => {
  const primary = getAiProvider();
  const configuredFallbacks = (
    resumeAnalysisConfig.fallbackProviders ||
    (primary === 'openrouter' ? 'groq,openai,google' : primary === 'groq' ? 'openrouter' : 'groq')
  )
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item): ResumeAnalysisAiProvider | null => {
      if (item === 'google' || item === 'gemini') return 'google';
      if (item === 'groq') return 'groq';
      if (item === 'openrouter') return 'openrouter';
      if (item === 'openai') return 'openai';
      return null;
    })
    .filter((item): item is ResumeAnalysisAiProvider => item != null);

  // Prefer OpenRouter at the front whenever its key exists.
  const preferred: ResumeAnalysisAiProvider[] = providerHasCredentials('openrouter')
    ? ['openrouter', primary, ...configuredFallbacks]
    : [primary, ...configuredFallbacks];

  const chain = Array.from(new Set(preferred));
  return chain.filter(providerHasCredentials);
};

const OPENROUTER_DEFAULT_MODELS = [
  'google/gemini-2.5-flash',
  // Prefer concrete free Gemini / Gemma — skip flaky openrouter/free auto-router.
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-4-26b-a4b-it:free',
];

const isOpenRouterFreeAutoRouter = (model: string): boolean =>
  /^openrouter\/free$/i.test(model.trim());

const isFreeOpenRouterModel = (model: string): boolean =>
  /:free$/i.test(model) || isOpenRouterFreeAutoRouter(model);

const getRequestTimeoutMs = (model?: string): number => {
  // Free router often queues/hangs — fail fast and try the next free model.
  if (model && isFreeOpenRouterModel(model)) {
    const freeTimeout = resumeAnalysisConfig.freeTimeoutMs;
    if (Number.isFinite(freeTimeout) && freeTimeout >= 10000) {
      return Math.min(freeTimeout, 60000);
    }
    return 35000;
  }
  const configured = resumeAnalysisConfig.timeoutMs;
  if (!Number.isFinite(configured) || configured < 15000) return 90000;
  return Math.min(configured, 180000);
};

/** Cap resume/JD size so free-tier prompts fit input token budgets. */
const truncateForAi = (text: string, maxChars: number): string => {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n[...truncated for AI token budget...]`;
};

const OPENAI_DEFAULT_MODELS = ['gpt-4o-mini', 'gpt-4o'];

const getModelCandidates = (provider: ResumeAnalysisAiProvider): string[] => {
  if (provider === 'openrouter') {
    const primary = resumeAnalysisConfig.model || OPENROUTER_DEFAULT_MODELS[0];
    const fallbacks = (
      resumeAnalysisConfig.fallbackModels || OPENROUTER_DEFAULT_MODELS.slice(1).join(',')
    )
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean)
      .map((model) => (model === 'qwen/qwen3' ? 'qwen/qwen3-32b' : model));

    // openrouter/free often returns empty / safety text — skip unless explicitly allowed.
    const allowAutoFree = resumeAnalysisConfig.allowOpenRouterFreeAuto;

    const models = Array.from(new Set([primary, ...fallbacks])).filter(
      (model) => allowAutoFree || !isOpenRouterFreeAutoRouter(model),
    );

    return models.length > 0 ? models : [OPENROUTER_DEFAULT_MODELS[0]!];
  }

  if (provider === 'openai') {
    const primary = resumeAnalysisConfig.model || OPENAI_DEFAULT_MODELS[0];
    const fallbacks = (resumeAnalysisConfig.fallbackModels || OPENAI_DEFAULT_MODELS[1])
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    return Array.from(new Set([primary, ...fallbacks]));
  }

  if (provider === 'groq') {
    // Prefer smaller/faster models first when daily token budget is tight.
    const primary = resumeAnalysisConfig.groqModel;
    const groqSafe = primary.includes('/') ? 'llama-3.1-8b-instant' : primary;
    return Array.from(new Set([groqSafe, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile']));
  }

  const configuredModel = resumeAnalysisConfig.model || resumeAnalysisConfig.parserModel;
  const googleSafe = configuredModel.includes('/') ? 'gemini-2.0-flash' : configuredModel;
  return Array.from(new Set([googleSafe, 'gemini-2.0-flash', 'gemini-1.5-flash']));
};

const createGoogleClient = (model: string): ChatGoogleGenerativeAI => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new AppError('AI provider not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.', 500);
  }
  return new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: resumeAnalysisConfig.temperature,
    maxRetries: resumeAnalysisConfig.maxRetries,
  });
};

const invokeGoogleModel = async (
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> => {
  const response = await createGoogleClient(model).invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]);

  return extractJson((response as { content?: unknown }).content ?? response);
};

const getMaxOutputTokens = (providerLabel: string, model?: string, override?: number): number => {
  if (typeof override === 'number' && override > 0) {
    return Math.min(override, 8000);
  }

  const isGroq = /^Groq/i.test(providerLabel);
  const isFreeModel = Boolean(model) && isFreeOpenRouterModel(model!);
  // Keep paid OpenRouter under typical credit affordability (~2.5–3k) so responses
  // are not truncated after a 6000→2679 affordability cut mid-JSON.
  const fallback = isGroq ? 1000 : isFreeModel ? 2500 : 2800;
  const configured = Number(
    isGroq
      ? resumeAnalysisConfig.groqMaxTokens || resumeAnalysisConfig.maxTokens || fallback
      : resumeAnalysisConfig.maxTokens || fallback,
  );
  if (!Number.isFinite(configured) || configured <= 0) return fallback;
  return Math.min(configured, isGroq ? 1500 : isFreeModel ? 3000 : 3500);
};

const invokeOpenAiCompatibleChat = async (input: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  providerLabel: string;
  extraHeaders?: Record<string, string>;
  maxTokensOverride?: number;
}): Promise<string> => {
  const timeoutMs = getRequestTimeoutMs(input.model);
  let maxTokens = getMaxOutputTokens(input.providerLabel, input.model, input.maxTokensOverride);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
          ...input.extraHeaders,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: input.model,
          temperature: resumeAnalysisConfig.temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.userMessage },
          ],
          ...(/:free$/i.test(input.model) || /openrouter\/free/i.test(input.model)
            ? {}
            : { response_format: { type: 'json_object' } }),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        const detail =
          body.error?.message ??
          `${input.providerLabel} resume analysis request failed with ${response.status}`;
        const err = new AppError(`${detail} [${input.providerLabel} HTTP ${response.status}]`, 500);

        if (attempt === 0 && isMaxTokensAffordabilityError(err)) {
          const affordable = parseAffordableMaxTokens(err);
          const nextTokens = Math.max(
            512,
            Math.min(affordable ?? Math.floor(maxTokens * 0.7), maxTokens - 1),
          );
          if (nextTokens < maxTokens) {
            logger.warn(
              {
                provider: input.providerLabel,
                model: input.model,
                from: maxTokens,
                to: nextTokens,
              },
              'Retrying AI call with lower max_tokens after credit affordability error',
            );
            maxTokens = nextTokens;
            lastError = err;
            continue;
          }
        }

        throw err;
      }

      const content = body.choices?.[0]?.message?.content ?? '';
      if (!content.trim()) {
        throw new AppError(
          `${input.providerLabel} returned empty content for model ${input.model}`,
          500,
        );
      }
      return content;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AppError(
          `${input.providerLabel} timed out after ${timeoutMs}ms for model ${input.model}`,
          504,
        );
      }
      lastError = err;
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AppError(`${input.providerLabel} request failed`, 500);
};

const invokeGroqModel = async (
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> => {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    throw new AppError('AI provider not configured. Set GROQ_API_KEY (or GROQ_API_KEYS).', 500);
  }

  let lastError: unknown;
  for (let index = 0; index < keys.length; index += 1) {
    const apiKey = keys[index]!;
    try {
      // `await` is required here — a bare `return promise` would let a rejection
      // escape the try/catch and skip key rotation entirely.
      return await invokeOpenAiCompatibleChat({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey,
        model,
        systemPrompt,
        userMessage,
        providerLabel: keys.length > 1 ? `Groq(key#${index + 1})` : 'Groq',
      });
    } catch (err) {
      lastError = err;
      if (isAuthOrCreditError(err) && index < keys.length - 1) {
        logger.warn(
          { err, model, keyIndex: index + 1 },
          'Groq API key failed (auth/credit); trying next Groq key',
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AppError('All Groq API keys failed for resume analysis', 500);
};

const invokeOpenRouterModel = async (
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new AppError('AI provider not configured. Set OPENROUTER_API_KEY.', 500);
  }
  // Always use the selected candidate model (never hardcode openrouter/free).
  return invokeOpenAiCompatibleChat({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userMessage,
    providerLabel: 'OpenRouter',
    extraHeaders: {
      'HTTP-Referer': resumeAnalysisConfig.openRouterSiteUrl,
      'X-Title': resumeAnalysisConfig.openRouterAppName,
    },
  });
};

const invokeOpenAiModel = async (
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> => {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new AppError('AI provider not configured. Set OPENAI_API_KEY.', 500);
  }
  return invokeOpenAiCompatibleChat({
    url: 'https://api.openai.com/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userMessage,
    providerLabel: 'OpenAI',
  });
};

const invokeProviderModel = async (
  provider: ResumeAnalysisAiProvider,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> => {
  if (provider === 'openrouter') {
    return invokeOpenRouterModel(model, systemPrompt, userMessage);
  }
  if (provider === 'openai') {
    return invokeOpenAiModel(model, systemPrompt, userMessage);
  }
  if (provider === 'groq') {
    return invokeGroqModel(model, systemPrompt, userMessage);
  }
  return invokeGoogleModel(model, systemPrompt, userMessage);
};

export type { ResumeAnalysisAiProvider };

export {
  getAiProvider,
  getGoogleApiKey,
  getGroqApiKeys,
  getOpenRouterApiKey,
  getOpenAiApiKey,
  providerHasCredentials,
  getProviderFallbackChain,
  OPENROUTER_DEFAULT_MODELS,
  OPENAI_DEFAULT_MODELS,
  getModelCandidates,
  getRequestTimeoutMs,
  truncateForAi,
  isOpenRouterFreeAutoRouter,
  isFreeOpenRouterModel,
  getMaxOutputTokens,
  createGoogleClient,
  invokeGoogleModel,
  invokeOpenAiCompatibleChat,
  invokeGroqModel,
  invokeOpenRouterModel,
  invokeOpenAiModel,
  invokeProviderModel,
};
