import { afterEach, describe, expect, it } from 'vitest';
import { recommendationOpenRouterEmbeddingSettings } from '@/modules/ai-embeddings/config/embedding.config.js';

const KEYS = [
  'OPENROUTER_API_KEY',
  'OPENROUTER_BASE_URL',
  'OPENROUTER_HTTP_REFERER',
  'OPENROUTER_APP_TITLE',
  'OPENROUTER_ALLOW_FALLBACKS',
  'OPENROUTER_RECOMMENDATION_API_KEY',
  'OPENROUTER_RECOMMENDATION_BASE_URL',
  'OPENROUTER_RECOMMENDATION_HTTP_REFERER',
  'OPENROUTER_RECOMMENDATION_APP_TITLE',
  'OPENROUTER_RECOMMENDATION_ALLOW_FALLBACKS',
] as const;

describe('recommendationOpenRouterEmbeddingSettings', () => {
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of KEYS) {
      if (previous.has(key)) {
        const value = previous.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    previous.clear();
  });

  const setEnv = (overrides: Partial<Record<(typeof KEYS)[number], string | undefined>>) => {
    for (const key of KEYS) {
      if (!previous.has(key)) previous.set(key, process.env[key]);
      const next = overrides[key];
      if (next === undefined) delete process.env[key];
      else process.env[key] = next;
    }
  };

  it('prefers OPENROUTER_RECOMMENDATION_* when set', () => {
    setEnv({
      OPENROUTER_API_KEY: 'shared-key',
      OPENROUTER_BASE_URL: 'https://shared.example/v1',
      OPENROUTER_HTTP_REFERER: 'https://shared.app',
      OPENROUTER_APP_TITLE: 'Shared App',
      OPENROUTER_ALLOW_FALLBACKS: 'false',
      OPENROUTER_RECOMMENDATION_API_KEY: 'recommendation-key',
      OPENROUTER_RECOMMENDATION_BASE_URL: 'https://recommendation.example/v1',
      OPENROUTER_RECOMMENDATION_HTTP_REFERER: 'https://recommendation.app',
      OPENROUTER_RECOMMENDATION_APP_TITLE: 'Recommendation App',
      OPENROUTER_RECOMMENDATION_ALLOW_FALLBACKS: 'true',
    });

    expect(recommendationOpenRouterEmbeddingSettings()).toMatchObject({
      apiKey: 'recommendation-key',
      apiKeyEnvName: 'OPENROUTER_RECOMMENDATION_API_KEY',
      baseUrl: 'https://recommendation.example/v1',
      httpReferer: 'https://recommendation.app',
      appTitle: 'Recommendation App',
      allowFallbacks: true,
    });
  });

  it('falls back to shared OPENROUTER_* when recommendation keys are unset', () => {
    setEnv({
      OPENROUTER_API_KEY: 'shared-key',
      OPENROUTER_BASE_URL: 'https://shared.example/v1',
      OPENROUTER_HTTP_REFERER: 'https://shared.app',
      OPENROUTER_APP_TITLE: 'Shared App',
      OPENROUTER_ALLOW_FALLBACKS: 'true',
      OPENROUTER_RECOMMENDATION_API_KEY: undefined,
      OPENROUTER_RECOMMENDATION_BASE_URL: undefined,
      OPENROUTER_RECOMMENDATION_HTTP_REFERER: undefined,
      OPENROUTER_RECOMMENDATION_APP_TITLE: undefined,
      OPENROUTER_RECOMMENDATION_ALLOW_FALLBACKS: undefined,
    });

    expect(recommendationOpenRouterEmbeddingSettings()).toMatchObject({
      apiKey: 'shared-key',
      apiKeyEnvName: 'OPENROUTER_RECOMMENDATION_API_KEY or OPENROUTER_API_KEY',
      baseUrl: 'https://shared.example/v1',
      httpReferer: 'https://shared.app',
      appTitle: 'Shared App',
      allowFallbacks: true,
    });
  });
});
