import type { Env } from '@/shared/config/env.conf.js';
import { env } from '@/shared/config/env.conf.js';

export type AiMailProviderName = 'fake' | 'openrouter';

export interface AiMailConfig {
  enabled: boolean;
  saveDraftsEnabled: boolean;
  partialRewriteEnabled: boolean;
  provider: AiMailProviderName;
  promptVersion: string;
  outputSchemaVersion: string;
  maxRevisionsPerDraft: number;
  fakeMode: 'success' | 'timeout' | 'malformed' | 'unsupported_claim' | 'unavailable';
  generation: {
    temperature: number;
    maxOutputTokens: number;
    timeoutMs: number;
    maxRetries: number;
  };
  limits: {
    maxJobDescriptionCharacters: number;
    maxConstraintCharacters: number;
    maxAdditionalContextCharacters: number;
    maxSubjectCharacters: number;
    maxBodyCharacters: number;
    maxProfileSkills: number;
    maxExperienceEntries: number;
    maxExperienceHighlightsPerEntry: number;
    maxProjects: number;
    maxAchievements: number;
    maxJobRequirements: number;
    maxJobResponsibilities: number;
    maxJobKeywords: number;
    generationsPerUserPerHour: number;
    regenerationsPerDraft: number;
    sendsPerUserPerHour: number;
    sendsPerUserPerDay: number;
    minFollowUpIntervalHours: number;
  };
  privacy: {
    logPromptContent: boolean;
    logResponseContent: boolean;
    storeGenerationContext: boolean;
    contextRetentionDays: number;
  };
  phase2: {
    gmailIntegrationEnabled: boolean;
    mailSendingEnabled: boolean;
  };
}

export interface AiMailServerConfig extends AiMailConfig {
  recipientHmacSecret?: string;
  providerSecrets: {
    openrouter: {
      apiKey?: string;
      baseUrl: string;
      model?: string;
      fallbackModels: string[];
      httpReferer?: string;
      appName: string;
      structuredOutputEnabled: boolean;
      freeRouterAllowed: boolean;
    };
  };
}

const commaSeparated = (value?: string): string[] =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

export const buildAiMailConfig = (source: Env): AiMailServerConfig => ({
  enabled: source.AI_MAIL_ENABLED,
  saveDraftsEnabled: source.AI_MAIL_SAVE_DRAFTS_ENABLED,
  partialRewriteEnabled: source.AI_MAIL_PARTIAL_REWRITE_ENABLED,
  provider: source.AI_PROVIDER,
  promptVersion: source.AI_MAIL_PROMPT_VERSION,
  outputSchemaVersion: source.AI_MAIL_OUTPUT_SCHEMA_VERSION,
  maxRevisionsPerDraft: source.AI_MAIL_MAX_REVISIONS_PER_DRAFT,
  fakeMode: source.AI_MAIL_FAKE_MODE,
  generation: {
    temperature: source.AI_MAIL_TEMPERATURE,
    maxOutputTokens: source.AI_MAIL_MAX_OUTPUT_TOKENS,
    timeoutMs: source.AI_MAIL_TIMEOUT_MS,
    maxRetries: source.AI_MAIL_MAX_RETRIES,
  },
  limits: {
    maxJobDescriptionCharacters: source.AI_MAIL_MAX_JD_CHARACTERS,
    maxConstraintCharacters: source.AI_MAIL_MAX_CONSTRAINT_CHARACTERS,
    maxAdditionalContextCharacters: source.AI_MAIL_MAX_ADDITIONAL_CONTEXT_CHARACTERS,
    maxSubjectCharacters: source.AI_MAIL_MAX_SUBJECT_CHARACTERS,
    maxBodyCharacters: source.AI_MAIL_MAX_BODY_CHARACTERS,
    maxProfileSkills: source.AI_MAIL_MAX_PROFILE_SKILLS,
    maxExperienceEntries: source.AI_MAIL_MAX_EXPERIENCE_ENTRIES,
    maxExperienceHighlightsPerEntry: source.AI_MAIL_MAX_EXPERIENCE_HIGHLIGHTS_PER_ENTRY,
    maxProjects: source.AI_MAIL_MAX_PROJECTS,
    maxAchievements: source.AI_MAIL_MAX_ACHIEVEMENTS,
    maxJobRequirements: source.AI_MAIL_MAX_JOB_REQUIREMENTS,
    maxJobResponsibilities: source.AI_MAIL_MAX_JOB_RESPONSIBILITIES,
    maxJobKeywords: source.AI_MAIL_MAX_JOB_KEYWORDS,
    generationsPerUserPerHour: source.AI_MAIL_GENERATIONS_PER_USER_PER_HOUR,
    regenerationsPerDraft: source.AI_MAIL_REGENERATIONS_PER_DRAFT,
    sendsPerUserPerHour: source.MAIL_SENDS_PER_USER_PER_HOUR,
    sendsPerUserPerDay: source.MAIL_SENDS_PER_USER_PER_DAY,
    minFollowUpIntervalHours: source.AI_MAIL_MIN_FOLLOW_UP_INTERVAL_HOURS,
  },
  privacy: {
    logPromptContent: source.AI_MAIL_LOG_PROMPT_CONTENT,
    logResponseContent: source.AI_MAIL_LOG_RESPONSE_CONTENT,
    storeGenerationContext: source.AI_MAIL_STORE_GENERATION_CONTEXT,
    contextRetentionDays: source.AI_MAIL_CONTEXT_RETENTION_DAYS,
  },
  phase2: {
    gmailIntegrationEnabled: source.GOOGLE_GMAIL_SEND_ENABLED || source.GMAIL_INTEGRATION_ENABLED,
    mailSendingEnabled: source.MAIL_SENDING_ENABLED,
  },
  recipientHmacSecret: source.AI_MAIL_RECIPIENT_HMAC_SECRET,
  providerSecrets: {
    openrouter: {
      apiKey: source.OPENROUTER_API_KEY,
      baseUrl: source.OPENROUTER_BASE_URL,
      model: source.OPENROUTER_MODEL,
      fallbackModels: commaSeparated(source.OPENROUTER_FALLBACK_MODELS),
      httpReferer: source.OPENROUTER_HTTP_REFERER,
      appName: source.OPENROUTER_APP_NAME,
      structuredOutputEnabled: source.OPENROUTER_STRUCTURED_OUTPUT_ENABLED,
      freeRouterAllowed: source.OPENROUTER_FREE_ROUTER_ALLOWED,
    },
  },
});

export const aiMailServerConfig = buildAiMailConfig(env);

export const aiMailConfig: AiMailConfig = {
  enabled: aiMailServerConfig.enabled,
  saveDraftsEnabled: aiMailServerConfig.saveDraftsEnabled,
  partialRewriteEnabled: aiMailServerConfig.partialRewriteEnabled,
  provider: aiMailServerConfig.provider,
  promptVersion: aiMailServerConfig.promptVersion,
  outputSchemaVersion: aiMailServerConfig.outputSchemaVersion,
  maxRevisionsPerDraft: aiMailServerConfig.maxRevisionsPerDraft,
  fakeMode: aiMailServerConfig.fakeMode,
  generation: aiMailServerConfig.generation,
  limits: aiMailServerConfig.limits,
  privacy: aiMailServerConfig.privacy,
  phase2: aiMailServerConfig.phase2,
};
