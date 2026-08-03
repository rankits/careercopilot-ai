import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { AiAnalysisOutput } from '@/modules/resume-analysis/types/resume-analysis.types.js';
import { resumeAnalysisAiSchema } from '@/modules/resume-analysis/ai/resume-analysis-ai.schema.js';
import { buildResumeAnalysisPrompt } from '@/modules/resume-analysis/ai/prompts/resume-analysis.prompt.js';
import { termAppearsIn } from '@/modules/resume-analysis/utils/text-match.js';
import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkill,
  normalizeProfessionalSkills,
} from '@/modules/resumes/utils/skill-normalizer.js';

type ResumeAnalysisAiProvider = 'google' | 'groq' | 'openrouter' | 'openai';

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const getAiProvider = (): ResumeAnalysisAiProvider => {
  const configuredProvider = (
    process.env.AI_RESUME_ANALYSIS_PROVIDER ||
    process.env.AI_RESUME_PARSER_PROVIDER ||
    'openrouter'
  ).toLowerCase();

  if (configuredProvider === 'google' || configuredProvider === 'gemini') return 'google';
  if (configuredProvider === 'groq') return 'groq';
  if (configuredProvider === 'openrouter') return 'openrouter';
  if (configuredProvider === 'openai') return 'openai';

  throw new AppError(`Unsupported resume analysis AI provider: ${configuredProvider}`, 501);
};

const getGoogleApiKey = (): string | null => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  return apiKey.trim() || null;
};

/** Primary + optional rotated Groq keys (comma list or GROQ_API_KEY_2 / _FALLBACK). */
const getGroqApiKeys = (): string[] => {
  const fromList = (process.env.GROQ_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const singles = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_FALLBACK,
  ]
    .map((key) => key?.trim() || '')
    .filter(Boolean);

  return Array.from(new Set([...singles, ...fromList]));
};

const getOpenRouterApiKey = (): string | null => {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  return apiKey.trim() || null;
};

const getOpenAiApiKey = (): string | null => {
  const apiKey = process.env.OPENAI_API_KEY || '';
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
    process.env.AI_RESUME_ANALYSIS_FALLBACK_PROVIDERS ||
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
    const freeTimeout = Number(process.env.AI_RESUME_ANALYSIS_FREE_TIMEOUT_MS || '35000');
    if (Number.isFinite(freeTimeout) && freeTimeout >= 10000) {
      return Math.min(freeTimeout, 60000);
    }
    return 35000;
  }
  const configured = Number(process.env.AI_RESUME_ANALYSIS_TIMEOUT_MS || '90000');
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
    const primary =
      process.env.AI_RESUME_ANALYSIS_MODEL || OPENROUTER_DEFAULT_MODELS[0];
    const fallbacks = (
      process.env.AI_RESUME_ANALYSIS_FALLBACK_MODELS ||
      OPENROUTER_DEFAULT_MODELS.slice(1).join(',')
    )
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean)
      .map((model) => (model === 'qwen/qwen3' ? 'qwen/qwen3-32b' : model));

    // openrouter/free often returns empty / safety text — skip unless explicitly allowed.
    const allowAutoFree =
      String(process.env.AI_RESUME_ANALYSIS_ALLOW_OPENROUTER_FREE || '').toLowerCase() ===
      'true';

    const models = Array.from(new Set([primary, ...fallbacks])).filter(
      (model) => allowAutoFree || !isOpenRouterFreeAutoRouter(model),
    );

    return models.length > 0 ? models : [OPENROUTER_DEFAULT_MODELS[0]!];
  }

  if (provider === 'openai') {
    const primary = process.env.AI_RESUME_ANALYSIS_MODEL || OPENAI_DEFAULT_MODELS[0];
    const fallbacks = (process.env.AI_RESUME_ANALYSIS_FALLBACK_MODELS || OPENAI_DEFAULT_MODELS[1])
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    return Array.from(new Set([primary, ...fallbacks]));
  }

  if (provider === 'groq') {
    // Prefer smaller/faster models first when daily token budget is tight.
    const primary =
      process.env.AI_RESUME_ANALYSIS_GROQ_MODEL || 'llama-3.1-8b-instant';
    const groqSafe = primary.includes('/') ? 'llama-3.1-8b-instant' : primary;
    return Array.from(
      new Set([groqSafe, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile']),
    );
  }

  const configuredModel =
    process.env.AI_RESUME_ANALYSIS_MODEL ||
    process.env.AI_RESUME_PARSER_MODEL ||
    'gemini-2.0-flash';
  const googleSafe = configuredModel.includes('/') ? 'gemini-2.0-flash' : configuredModel;
  return Array.from(new Set([googleSafe, 'gemini-2.0-flash', 'gemini-1.5-flash']));
};

const isMaxTokensAffordabilityError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('fewer max_tokens') ||
    message.includes('can only afford') ||
    (message.includes('402') && message.includes('max_tokens'))
  );
};

const parseAffordableMaxTokens = (err: unknown): number | null => {
  const message = getErrorMessage(err);
  const match = message.match(/can only afford\s+(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 256 ? value : null;
};

const isProviderExhaustedError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  // Org-wide daily quotas — more models on same provider will also fail.
  if (
    (message.includes('429') || message.includes('rate limit')) &&
    (message.includes('tokens per day') ||
      message.includes('tpd') ||
      message.includes('per day') ||
      message.includes('daily'))
  ) {
    return true;
  }
  return isAuthOrCreditError(err);
};

const isAuthOrCreditError = (err: unknown): boolean => {
  // Recoverable: lower max_tokens and retry / try next free model.
  if (isMaxTokensAffordabilityError(err)) return false;

  const message = getErrorMessage(err).toLowerCase();
  // Groq/OpenRouter error copy often includes a billing upgrade URL — that is NOT a credit failure.
  if (message.includes('request too large') || message.includes('413')) return false;

  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('402') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('incorrect api key') ||
    message.includes('authentication') ||
    message.includes('expired') ||
    message.includes('revoked') ||
    message.includes('insufficient credits') ||
    message.includes('no credits') ||
    message.includes('payment required') ||
    message.includes('user not found') ||
    message.includes('key limit') ||
    (message.includes('invalid api key') && message.includes('api key')) ||
    (message.includes('quota') && !message.includes('tokens per minute'))
  );
};

const isRequestTooLargeError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('413') ||
    message.includes('request too large') ||
    message.includes('reduce your message size') ||
    message.includes('context length') ||
    message.includes('maximum context')
  );
};

const isRetryableModelError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    isAuthOrCreditError(err) ||
    isMaxTokensAffordabilityError(err) ||
    isRequestTooLargeError(err) ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('not found') ||
    message.includes('unavailable for free') ||
    message.includes('not supported') ||
    message.includes('temporarily') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('empty content') ||
    message.includes('over capacity') ||
    message.includes('model_decommissioned') ||
    message.includes('unterminated string') ||
    message.includes('unexpected end of json')
  );
};

const extractJson = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map((p) => (typeof p === 'string' ? p : '')).join('');
  return '';
};

const createGoogleClient = (model: string): ChatGoogleGenerativeAI => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new AppError(
      'AI provider not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.',
      500,
    );
  }
  return new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: Number(process.env.AI_RESUME_PARSER_TEMPERATURE || '0.2'),
    maxRetries: Number(process.env.AI_RESUME_PARSER_MAX_RETRIES || '2'),
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

const getMaxOutputTokens = (
  providerLabel: string,
  model?: string,
  override?: number,
): number => {
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
      ? process.env.AI_RESUME_ANALYSIS_GROQ_MAX_TOKENS ||
          process.env.AI_RESUME_ANALYSIS_MAX_TOKENS ||
          fallback
      : process.env.AI_RESUME_ANALYSIS_MAX_TOKENS || fallback,
  );
  if (!Number.isFinite(configured) || configured <= 0) return fallback;
  return Math.min(configured, isGroq ? 1500 : isFreeModel ? 3000 : 3500);
};

/** Extract the first JSON object from model output (ignore preambles / safety text). */
const extractJsonObject = (raw: string): string => {
  const text = raw.trim();
  if (!text) return text;
  if (text.startsWith('{') && text.endsWith('}')) return text;

  const start = text.indexOf('{');
  if (start < 0) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Truncated object — return from first brace so repair can close it.
  return text.slice(start);
};

/** Best-effort repair when the model truncates JSON mid-string. */
const tryRepairJson = (raw: string): string => {
  let text = extractJsonObject(raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
  if (!text) return text;
  try {
    JSON.parse(text);
    return text;
  } catch {
    let repaired = text;
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) repaired += '"';
    // Close dangling escapes / incomplete unicode sequences.
    repaired = repaired.replace(/\\$/, '');
    repaired = repaired.replace(/,\s*$/g, '');
    for (let i = 0; i < 32; i += 1) {
      try {
        JSON.parse(repaired);
        return repaired;
      } catch {
        const lastOpenObj = repaired.lastIndexOf('{');
        const lastOpenArr = repaired.lastIndexOf('[');
        const lastCloseObj = repaired.lastIndexOf('}');
        const lastCloseArr = repaired.lastIndexOf(']');
        if (lastOpenArr > lastCloseArr && lastOpenArr >= lastOpenObj) {
          repaired += ']';
        } else if (lastOpenObj > lastCloseObj) {
          repaired += '}';
        } else {
          repaired = repaired.replace(/,\s*([}\]])/g, '$1');
          try {
            JSON.parse(repaired);
            return repaired;
          } catch {
            // Truncated mid-value: drop the last incomplete property.
            const cut = Math.max(
              repaired.lastIndexOf(','),
              repaired.lastIndexOf('{'),
              repaired.lastIndexOf('['),
            );
            if (cut > 0 && cut < repaired.length - 1) {
              repaired = repaired.slice(0, cut);
              const q = (repaired.match(/"/g) || []).length;
              if (q % 2 === 1) repaired += '"';
              continue;
            }
            break;
          }
        }
      }
    }
    return text;
  }
};

const isNonJsonModelOutput = (raw: string): boolean => {
  const text = raw.trim();
  if (!text) return true;
  if (/^user safety:/i.test(text)) return true;
  if (!text.includes('{')) return true;
  return false;
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
          temperature: Number(process.env.AI_RESUME_PARSER_TEMPERATURE || '0.2'),
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
        const err = new AppError(
          `${detail} [${input.providerLabel} HTTP ${response.status}]`,
          500,
        );

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
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://careercopilot.local',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'CareerCopilot Resume Analysis',
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

const normalizeSkillText = (value: string): string =>
  normalizeProfessionalSkills(value.split(/[,|;/]+/)).join(', ');

const isGroundedSuggestion = (
  suggestion: AiAnalysisOutput['suggestions'][number],
  resumeText: string,
): boolean => {
  if (!/^(experience|projects)$/i.test(suggestion.category)) return true;
  const original = suggestion.originalText.trim();
  const suggested = suggestion.suggestedText.trim();
  if (!original || !suggested) return false;
  if (original.split(/\n/).length > 1 || suggested.split(/\n/).length > 1) return false;
  return resumeText.includes(original);
};

const sanitizeSkillKeywords = <T extends { term: string }>(items: T[]): T[] =>
  items.flatMap((item) => {
    const term = normalizeProfessionalSkill(item.term);
    return term ? [{ ...item, term }] : [];
  });

const skillMatchScore = (matchedSkills: string[], jdSkills: string[]): number =>
  jdSkills.length > 0 ? Math.round((matchedSkills.length / jdSkills.length) * 100) : 0;

const sanitizeAiSkillOutput = (aiResult: AiAnalysisOutput): AiAnalysisOutput => ({
  ...aiResult,
  missingSkills: normalizeProfessionalSkills(aiResult.missingSkills ?? []),
  improvedSkills: normalizeProfessionalSkills(aiResult.improvedSkills ?? []),
  recommendedSkillOrder: normalizeProfessionalSkills(aiResult.recommendedSkillOrder ?? []),
  missingKeywords: sanitizeSkillKeywords(aiResult.missingKeywords ?? []),
  matchedKeywords: sanitizeSkillKeywords(aiResult.matchedKeywords ?? []),
  skillAnalysis: {
    matchedSkills: normalizeProfessionalSkills(aiResult.skillAnalysis?.matchedSkills ?? []),
    missingSkills: normalizeProfessionalSkills(aiResult.skillAnalysis?.missingSkills ?? []),
    transferableSkills: normalizeProfessionalSkills(aiResult.skillAnalysis?.transferableSkills ?? []),
    recommendedSkills: normalizeProfessionalSkills(aiResult.skillAnalysis?.recommendedSkills ?? []),
  },
  suggestions: (aiResult.suggestions ?? [])
    .map((suggestion) =>
      suggestion.category === 'skills'
        ? { ...suggestion, suggestedText: normalizeSkillText(suggestion.suggestedText) }
        : suggestion,
    )
    .filter((suggestion) => suggestion.category !== 'skills' || suggestion.suggestedText.length > 0),
  optimizedSections: {
    ...aiResult.optimizedSections,
    skills: normalizeProfessionalSkills(aiResult.optimizedSections?.skills ?? []),
  },
});

const enrichAnalysisWithJdSkills = (
  aiResult: AiAnalysisOutput,
  resumeText: string,
  jobDescription?: string,
  targetRole?: string,
): AiAnalysisOutput => {
  const jdText = [jobDescription ?? '', targetRole ?? ''].join('\n');
  if (!jdText.trim()) return aiResult;

  const jdSkills = normalizeProfessionalSkills([
    ...extractProfessionalSkillsFromText(jobDescription ?? ''),
    ...(aiResult.skillAnalysis?.missingSkills ?? []).filter((skill) =>
      termAppearsIn(jobDescription ?? '', skill),
    ),
    ...(aiResult.skillAnalysis?.recommendedSkills ?? []).filter((skill) =>
      termAppearsIn(jobDescription ?? '', skill),
    ),
    ...(aiResult.missingSkills ?? []).filter((skill) => termAppearsIn(jobDescription ?? '', skill)),
  ]);
  if (jdSkills.length === 0) return aiResult;

  const matchedFromJd = jdSkills.filter((skill) => termAppearsIn(resumeText, skill));
  const missingFromJd = jdSkills.filter((skill) => !termAppearsIn(resumeText, skill));

  const skillAnalysis = {
    matchedSkills: normalizeProfessionalSkills(matchedFromJd),
    missingSkills: normalizeProfessionalSkills(missingFromJd),
    transferableSkills: normalizeProfessionalSkills(aiResult.skillAnalysis?.transferableSkills ?? []),
    recommendedSkills: normalizeProfessionalSkills(missingFromJd),
  };

  const missingKeywords = [...(aiResult.missingKeywords ?? [])];
  const existingTerms = new Set(missingKeywords.map((item) => item.term.toLowerCase()));
  for (const skill of missingFromJd.slice(0, 10)) {
    if (existingTerms.has(skill.toLowerCase())) continue;
    missingKeywords.push({
      term: skill,
      importance: 'high' as const,
      reason: `${skill} appears in the job description and should be reflected for ATS keyword match.`,
    });
  }

  const suggestions = (aiResult.suggestions ?? []).filter((suggestion) =>
    isGroundedSuggestion(suggestion, resumeText),
  );
  const hasSkillsSuggestion = suggestions.some((item) => /^skills$/i.test(item.category));

  if (missingFromJd.length > 0 && !hasSkillsSuggestion) {
    const currentSkillsLine =
      (aiResult.optimizedSections?.skills ?? []).join(', ') ||
      skillAnalysis.matchedSkills.slice(0, 8).join(', ') ||
      '';
    const suggestedSkills = normalizeProfessionalSkills([
      ...skillAnalysis.matchedSkills,
      ...missingFromJd.slice(0, 8),
    ]).join(', ');

    suggestions.unshift({
      id: 'suggestion-jd-skills',
      title: `Add ${missingFromJd.slice(0, 3).join(', ')} for JD ATS match`,
      category: 'skills',
      originalText: currentSkillsLine,
      suggestedText: suggestedSkills,
      impact: 'HIGH' as const,
      reason:
        'These skills are required or strongly preferred in the job description. Adding them to your Skills section improves ATS skill/keyword match.',
    });
  }

  return {
    ...aiResult,
    skillAnalysis,
    missingKeywords,
    suggestions,
    optimizedSections: {
      ...aiResult.optimizedSections,
      skills: normalizeProfessionalSkills([
        ...(aiResult.optimizedSections?.skills ?? []),
        ...matchedFromJd,
      ]).filter((skill) => termAppearsIn(resumeText, skill)),
    },
    missingSkills: missingFromJd,
    improvedSkills: normalizeProfessionalSkills(aiResult.improvedSkills ?? []).filter((skill) =>
      termAppearsIn(resumeText, skill),
    ),
    recommendedSkillOrder: normalizeProfessionalSkills([...matchedFromJd, ...missingFromJd]),
    skillMatch: skillMatchScore(matchedFromJd, jdSkills),
  };
};

export const resumeAnalysisAiClient = {
  async analyze(
    resumeText: string,
    targetRole: string,
    experienceLevel: string,
    jobDescription?: string,
  ): Promise<AiAnalysisOutput> {
    const providers = getProviderFallbackChain();
    if (providers.length === 0) {
      throw new AppError(
        'No AI provider keys configured. Set OPENROUTER_API_KEY and/or GROQ_API_KEY (or OPENAI_API_KEY / GOOGLE_API_KEY).',
        500,
      );
    }

    logger.info(
      {
        providers,
        resumeChars: resumeText.length,
        jdChars: jobDescription?.length ?? 0,
      },
      'Resume analysis AI starting (OpenRouter preferred, then fallbacks)',
    );

    let lastError: unknown;
    for (const provider of providers) {
      const models = getModelCandidates(provider);
      for (const model of models) {
        // Compact by default — full prompt routinely truncates under credit max_tokens caps.
        const preferFullPrompt =
          String(process.env.AI_RESUME_ANALYSIS_FULL_PROMPT || '').toLowerCase() === 'true';
        let compact =
          provider === 'groq' ||
          isFreeOpenRouterModel(model) ||
          (provider === 'openrouter' && !preferFullPrompt);
        const resumeLimit =
          provider === 'groq'
            ? Number(process.env.AI_RESUME_ANALYSIS_GROQ_MAX_RESUME_CHARS || 4500)
            : compact
              ? Number(process.env.AI_RESUME_ANALYSIS_MAX_RESUME_CHARS || 10000)
              : Number(process.env.AI_RESUME_ANALYSIS_MAX_RESUME_CHARS || 14000);
        const jdLimit =
          provider === 'groq'
            ? Number(process.env.AI_RESUME_ANALYSIS_GROQ_MAX_JD_CHARS || 2000)
            : Number(process.env.AI_RESUME_ANALYSIS_MAX_JD_CHARS || 5000);

        let safeResume = truncateForAi(resumeText, resumeLimit);
        let safeJd = jobDescription
          ? truncateForAi(jobDescription, jdLimit)
          : jobDescription;

        const runOnce = async (resume: string, jd: string | undefined, useCompact: boolean) => {
          const { systemPrompt, userMessage } = buildResumeAnalysisPrompt(
            resume,
            targetRole,
            experienceLevel,
            jd,
            { compact: useCompact },
          );
          logger.info(
            {
              provider,
              model,
              compact: useCompact,
              resumeChars: resume.length,
              jdChars: jd?.length ?? 0,
            },
            'Resume analysis invoking AI model',
          );
          const rawText = await invokeProviderModel(provider, model, systemPrompt, userMessage);
          if (isNonJsonModelOutput(rawText)) {
            throw new SyntaxError(
              `Model returned non-JSON output: ${rawText.slice(0, 120).replace(/\s+/g, ' ')}`,
            );
          }
          let jsonText = extractJsonObject(
            rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
          );
          try {
            JSON.parse(jsonText);
          } catch {
            jsonText = tryRepairJson(jsonText);
          }
          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(jsonText);
          } catch (parseErr) {
            // Last resort: strip from the unterminated tail and re-repair.
            const softer = tryRepairJson(jsonText.slice(0, Math.max(200, jsonText.length - 400)));
            parsedJson = JSON.parse(softer);
            logger.warn(
              { provider, model, parseErr: getErrorMessage(parseErr) },
              'Parsed resume analysis JSON after aggressive tail trim',
            );
          }
          return resumeAnalysisAiSchema.parse(parsedJson) as AiAnalysisOutput;
        };

        try {
          let parsed: AiAnalysisOutput;
          try {
            parsed = await runOnce(safeResume, safeJd, compact);
          } catch (err) {
            // Shrink input and retry once on context/TPM overflow.
            if (isRequestTooLargeError(err)) {
              logger.warn(
                { err, provider, model },
                'Prompt too large; retrying same model with smaller resume/JD',
              );
              safeResume = truncateForAi(safeResume, Math.floor(safeResume.length * 0.55));
              safeJd = safeJd
                ? truncateForAi(safeJd, Math.max(800, Math.floor(safeJd.length * 0.55)))
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else if (
              !compact &&
              (err instanceof SyntaxError ||
                /unterminated string|unexpected end of json|non-json/i.test(getErrorMessage(err)))
            ) {
              // Truncated full-prompt responses (often after affordability max_tokens cut).
              logger.warn(
                { err, provider, model, wasCompact: compact },
                'Invalid/truncated JSON; retrying same model in compact mode',
              );
              compact = true;
              safeResume = truncateForAi(
                safeResume,
                Math.min(
                  safeResume.length,
                  Number(process.env.AI_RESUME_ANALYSIS_COMPACT_RESUME_CHARS || 6000),
                ),
              );
              safeJd = safeJd
                ? truncateForAi(
                    safeJd,
                    Math.min(
                      safeJd.length,
                      Number(process.env.AI_RESUME_ANALYSIS_COMPACT_JD_CHARS || 1800),
                    ),
                  )
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else if (
              compact &&
              (err instanceof SyntaxError ||
                /unterminated string|unexpected end of json/i.test(getErrorMessage(err)))
            ) {
              // Already compact + still truncated → shrink further once, then bail to Groq.
              logger.warn(
                { err, provider, model },
                'Compact JSON still truncated; retrying once with smaller input',
              );
              safeResume = truncateForAi(safeResume, Math.max(1200, Math.floor(safeResume.length * 0.5)));
              safeJd = safeJd
                ? truncateForAi(safeJd, Math.max(600, Math.floor(safeJd.length * 0.5)))
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else {
              throw err;
            }
          }

          logger.info(
            { provider, model, primary: provider === providers[0] },
            'Resume analysis AI succeeded',
          );
          return sanitizeAiSkillOutput(
            enrichAnalysisWithJdSkills(parsed, resumeText, jobDescription, targetRole),
          );
        } catch (err) {
          lastError = err;
          const message = getErrorMessage(err).toLowerCase();
          if (
            message.includes('unterminated string') ||
            message.includes('unexpected end of json') ||
            message.includes('invalid resume analysis') ||
            message.includes('non-json') ||
            err instanceof SyntaxError
          ) {
            logger.error(
              { err, model, provider },
              'Invalid resume analysis response',
            );
            // Paid Gemini truncation: skip remaining OpenRouter free models → Groq.
            if (provider === 'openrouter' && !isFreeOpenRouterModel(model)) {
              logger.warn(
                { model, provider },
                'Primary OpenRouter model returned bad JSON; switching to Groq/next provider',
              );
              break;
            }
            continue;
          }
          // openrouter/free + other free models often return empty — jump to Groq fast.
          if (
            provider === 'openrouter' &&
            message.includes('empty content') &&
            (isOpenRouterFreeAutoRouter(model) || isFreeOpenRouterModel(model))
          ) {
            logger.warn(
              { err, model, provider },
              'Empty free OpenRouter content; skipping remaining free models and switching to Groq/next provider',
            );
            break;
          }
          if (isProviderExhaustedError(err)) {
            logger.warn(
              { err, model, provider },
              'Resume analysis provider exhausted (credits/quota/TPD); switching provider',
            );
            break;
          }
          if (!isRetryableModelError(err)) {
            logger.warn(
              { err, model, provider },
              'Resume analysis non-retryable model error; trying next model/provider',
            );
            continue;
          }
          logger.warn(
            { err, model, provider },
            'Resume analysis AI model failed; trying fallback model/provider',
          );
        }
      }
    }

    const detail = getErrorMessage(lastError);
    throw lastError instanceof Error
      ? lastError
      : new AppError(`AI analysis failed for all providers/models: ${detail}`, 500);
  },
};
