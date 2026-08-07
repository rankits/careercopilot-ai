/**
 * Centralized resume-analysis env knobs.
 * Read once at module load — never call process.env from request hot paths.
 */

const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const booleanFromEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitCsv = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export type ResumeAnalysisAiProviderName = 'google' | 'groq' | 'openrouter' | 'openai';

export const resumeAnalysisConfig = {
  useOutbox: booleanFromEnv(process.env.RESUME_ANALYSIS_USE_OUTBOX, false),
  staleAfterMs: numberFromEnv(process.env.AI_RESUME_ANALYSIS_STALE_MS, 4 * 60 * 1000),
  fullPrompt: booleanFromEnv(process.env.AI_RESUME_ANALYSIS_FULL_PROMPT, false),
  allowOpenRouterFreeAuto: booleanFromEnv(
    process.env.AI_RESUME_ANALYSIS_ALLOW_OPENROUTER_FREE,
    false,
  ),

  provider:
    optional(process.env.AI_RESUME_ANALYSIS_PROVIDER) ??
    optional(process.env.AI_RESUME_PARSER_PROVIDER) ??
    'groq',
  fallbackProviders:
    optional(process.env.AI_RESUME_ANALYSIS_FALLBACK_PROVIDERS) ?? 'openrouter,openai,google',

  model: optional(process.env.AI_RESUME_ANALYSIS_MODEL),
  parserModel: optional(process.env.AI_RESUME_PARSER_MODEL) ?? 'gemini-2.0-flash',
  groqModel: optional(process.env.AI_RESUME_ANALYSIS_GROQ_MODEL) ?? 'llama-3.1-8b-instant',
  fallbackModels: optional(process.env.AI_RESUME_ANALYSIS_FALLBACK_MODELS),

  temperature: numberFromEnv(process.env.AI_RESUME_PARSER_TEMPERATURE, 0.2),
  maxRetries: numberFromEnv(process.env.AI_RESUME_PARSER_MAX_RETRIES, 2),
  timeoutMs: numberFromEnv(process.env.AI_RESUME_ANALYSIS_TIMEOUT_MS, 90_000),
  freeTimeoutMs: numberFromEnv(process.env.AI_RESUME_ANALYSIS_FREE_TIMEOUT_MS, 35_000),
  maxTokens: numberFromEnv(process.env.AI_RESUME_ANALYSIS_MAX_TOKENS, 0),
  groqMaxTokens: numberFromEnv(process.env.AI_RESUME_ANALYSIS_GROQ_MAX_TOKENS, 0),

  maxResumeChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_MAX_RESUME_CHARS, 14_000),
  compactResumeChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_COMPACT_RESUME_CHARS, 6_000),
  groqMaxResumeChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_GROQ_MAX_RESUME_CHARS, 4_500),
  maxJdChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_MAX_JD_CHARS, 5_000),
  compactJdChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_COMPACT_JD_CHARS, 1_800),
  groqMaxJdChars: numberFromEnv(process.env.AI_RESUME_ANALYSIS_GROQ_MAX_JD_CHARS, 2_000),

  googleApiKey: optional(process.env.GOOGLE_API_KEY) ?? optional(process.env.GEMINI_API_KEY) ?? '',
  groqApiKeys: Array.from(
    new Set([
      ...[process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_FALLBACK]
        .map((key) => key?.trim() || '')
        .filter(Boolean),
      ...splitCsv(process.env.GROQ_API_KEYS),
    ]),
  ),
  openRouterApiKey: optional(process.env.OPENROUTER_API_KEY) ?? '',
  openAiApiKey: optional(process.env.OPENAI_API_KEY) ?? '',
  openRouterSiteUrl: optional(process.env.OPENROUTER_SITE_URL) ?? 'https://careercopilot.local',
  openRouterAppName: optional(process.env.OPENROUTER_APP_NAME) ?? 'CareerCopilot Resume Analysis',
} as const;

export const resolveResumeCharLimit = (input: {
  provider: ResumeAnalysisAiProviderName;
  compact: boolean;
}): number => {
  if (input.provider === 'groq') return resumeAnalysisConfig.groqMaxResumeChars;
  if (input.compact) {
    return Math.min(resumeAnalysisConfig.maxResumeChars, 10_000);
  }
  return resumeAnalysisConfig.maxResumeChars;
};

export const resolveJdCharLimit = (provider: ResumeAnalysisAiProviderName): number =>
  provider === 'groq' ? resumeAnalysisConfig.groqMaxJdChars : resumeAnalysisConfig.maxJdChars;
