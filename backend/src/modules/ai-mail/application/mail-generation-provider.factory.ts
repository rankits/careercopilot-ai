import type { MailGenerationProvider } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import type { AiMailProviderName } from '@/modules/ai-mail/config/ai-mail.config.js';
import { aiMailServerConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import {
  FakeMailGenerationProvider,
  type FakeMailGenerationMode,
} from '@/modules/ai-mail/providers/fake-mail-generation.provider.js';
import {
  OpenRouterMailGenerationAdapter,
  type OpenRouterMailAdapterConfig,
} from '@/modules/ai-mail/providers/openrouter/openrouter-mail.adapter.js';
import { env } from '@/shared/config/env.conf.js';

export class AiMailProviderNotConfiguredError extends Error {
  readonly code = 'AI_PROVIDER_NOT_CONFIGURED';

  constructor(provider: string) {
    super(`AI Mail provider "${provider}" is not available`);
    this.name = 'AiMailProviderNotConfiguredError';
  }
}

export const createMailGenerationProvider = (
  provider: AiMailProviderName,
  options?: {
    fakeMode?: FakeMailGenerationMode;
    openrouter?: Partial<OpenRouterMailAdapterConfig>;
  },
): MailGenerationProvider => {
  if (provider === 'fake') {
    return new FakeMailGenerationProvider(options?.fakeMode ?? env.AI_MAIL_FAKE_MODE);
  }

  if (provider === 'openrouter') {
    const secrets = aiMailServerConfig.providerSecrets.openrouter;
    const overrides = options?.openrouter ?? {};
    return new OpenRouterMailGenerationAdapter({
      apiKey: overrides.apiKey ?? secrets.apiKey ?? '',
      baseUrl: overrides.baseUrl ?? secrets.baseUrl,
      model: overrides.model ?? secrets.model ?? '',
      fallbackModels: overrides.fallbackModels ?? secrets.fallbackModels,
      httpReferer: overrides.httpReferer ?? secrets.httpReferer,
      appName: overrides.appName ?? secrets.appName,
      structuredOutputEnabled: overrides.structuredOutputEnabled ?? secrets.structuredOutputEnabled,
      freeRouterAllowed: overrides.freeRouterAllowed ?? secrets.freeRouterAllowed,
      temperature: overrides.temperature ?? aiMailServerConfig.generation.temperature,
      maxOutputTokens: overrides.maxOutputTokens ?? aiMailServerConfig.generation.maxOutputTokens,
      timeoutMs: overrides.timeoutMs ?? aiMailServerConfig.generation.timeoutMs,
      maxRetries: overrides.maxRetries ?? aiMailServerConfig.generation.maxRetries,
      fetchImpl: overrides.fetchImpl,
    });
  }

  throw new AiMailProviderNotConfiguredError(provider);
};
