import { describe, expect, it, vi } from 'vitest';

import {
  AiMailProviderNotConfiguredError,
  createMailGenerationProvider,
} from '@/modules/ai-mail/application/mail-generation-provider.factory.js';
import { FakeMailGenerationProvider } from '@/modules/ai-mail/providers/fake-mail-generation.provider.js';
import { OpenRouterMailGenerationAdapter } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.adapter.js';

describe('createMailGenerationProvider', () => {
  it('selects the deterministic fake provider', () => {
    const provider = createMailGenerationProvider('fake');

    expect(provider).toBeInstanceOf(FakeMailGenerationProvider);
    expect(provider.providerName).toBe('fake');
  });

  it('selects the OpenRouter adapter when configured', () => {
    const provider = createMailGenerationProvider('openrouter', {
      openrouter: {
        apiKey: 'test-key',
        model: 'openrouter/free',
        fetchImpl: vi.fn() as unknown as typeof fetch,
      },
    });

    expect(provider).toBeInstanceOf(OpenRouterMailGenerationAdapter);
    expect(provider.providerName).toBe('openrouter');
  });

  it('fails closed for unknown providers', () => {
    expect(() => createMailGenerationProvider('unknown' as 'fake')).toThrow(
      AiMailProviderNotConfiguredError,
    );
  });
});
