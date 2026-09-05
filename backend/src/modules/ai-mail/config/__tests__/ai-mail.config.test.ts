import { describe, expect, it } from 'vitest';

import { buildAiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { envSchema } from '@/shared/config/env.conf.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/careercopilot',
  NODE_ENV: 'test',
};

describe('AI Mail configuration', () => {
  it('uses safe Phase 1 defaults', () => {
    const parsed = envSchema.parse(baseEnv);
    const config = buildAiMailConfig(parsed);

    expect(config.enabled).toBe(false);
    expect(config.provider).toBe('fake');
    expect(config.privacy.logPromptContent).toBe(false);
    expect(config.privacy.logResponseContent).toBe(false);
    expect(config.phase2).toEqual({
      gmailIntegrationEnabled: false,
      mailSendingEnabled: false,
    });
  });

  it('parses fallback models and numeric generation settings', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      OPENROUTER_FALLBACK_MODELS: 'model-a, model-b',
      AI_MAIL_MAX_RETRIES: '3',
      AI_MAIL_TEMPERATURE: '0.7',
      OPENROUTER_STRUCTURED_OUTPUT_ENABLED: 'false',
      OPENROUTER_FREE_ROUTER_ALLOWED: 'true',
    });
    const config = buildAiMailConfig(parsed);

    expect(config.providerSecrets.openrouter.fallbackModels).toEqual(['model-a', 'model-b']);
    expect(config.providerSecrets.openrouter.structuredOutputEnabled).toBe(false);
    expect(config.providerSecrets.openrouter.freeRouterAllowed).toBe(true);
    expect(config.generation.maxRetries).toBe(3);
    expect(config.generation.temperature).toBe(0.7);
  });

  it('requires OpenRouter credentials only when the enabled feature selects it', () => {
    const missingCredentials = envSchema.safeParse({
      ...baseEnv,
      AI_MAIL_ENABLED: 'true',
      AI_PROVIDER: 'openrouter',
    });
    const disabledFeature = envSchema.safeParse({
      ...baseEnv,
      AI_MAIL_ENABLED: 'false',
      AI_PROVIDER: 'openrouter',
    });

    expect(missingCredentials.success).toBe(false);
    expect(disabledFeature.success).toBe(true);
  });

  it('fails closed for Phase 2 delivery by default', () => {
    const parsed = envSchema.parse(baseEnv);
    const config = buildAiMailConfig(parsed);

    expect(config.phase2).toEqual({
      gmailIntegrationEnabled: false,
      mailSendingEnabled: false,
    });
  });

  it('rejects send flags when Google mailbox OAuth is disabled', () => {
    const parsed = envSchema.safeParse({
      ...baseEnv,
      MAIL_SENDING_ENABLED: 'true',
      GOOGLE_GMAIL_SEND_ENABLED: 'true',
      GOOGLE_GMAIL_ENABLED: 'false',
    });

    expect(parsed.success).toBe(false);
  });

  it('wires Phase 2 flags from env when OAuth is enabled', () => {
    const encryptionKey = Buffer.alloc(32, 7).toString('base64');
    const stateKey = Buffer.alloc(32, 9).toString('base64');
    const hmacSecret = Buffer.alloc(32, 5).toString('base64');
    const parsed = envSchema.parse({
      ...baseEnv,
      MAIL_SENDING_ENABLED: 'true',
      GOOGLE_GMAIL_SEND_ENABLED: 'true',
      GOOGLE_GMAIL_ENABLED: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/settings/connected-accounts/google/result',
      GOOGLE_TOKEN_ENCRYPTION_KEY: encryptionKey,
      GOOGLE_OAUTH_STATE_SIGNING_KEY: stateKey,
      GOOGLE_OAUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/settings/connected-accounts',
      GOOGLE_OAUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/settings/connected-accounts',
      AI_MAIL_RECIPIENT_HMAC_SECRET: hmacSecret,
    });
    const config = buildAiMailConfig(parsed);

    expect(config.phase2).toEqual({
      gmailIntegrationEnabled: true,
      mailSendingEnabled: true,
    });
    expect(config.limits.sendsPerUserPerHour).toBe(10);
  });

  it('treats GMAIL_INTEGRATION_ENABLED as an alias of GOOGLE_GMAIL_SEND_ENABLED', () => {
    const encryptionKey = Buffer.alloc(32, 7).toString('base64');
    const stateKey = Buffer.alloc(32, 9).toString('base64');
    const parsed = envSchema.parse({
      ...baseEnv,
      GMAIL_INTEGRATION_ENABLED: 'true',
      GOOGLE_GMAIL_ENABLED: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/settings/connected-accounts/google/result',
      GOOGLE_TOKEN_ENCRYPTION_KEY: encryptionKey,
      GOOGLE_OAUTH_STATE_SIGNING_KEY: stateKey,
      GOOGLE_OAUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/settings/connected-accounts',
      GOOGLE_OAUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/settings/connected-accounts',
    });
    const config = buildAiMailConfig(parsed);

    expect(config.phase2.gmailIntegrationEnabled).toBe(true);
  });
});
