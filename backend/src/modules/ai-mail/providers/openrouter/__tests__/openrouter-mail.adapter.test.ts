import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MailGenerationProviderRequest } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import { OpenRouterMailGenerationAdapter } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.adapter.js';
import { OpenRouterMailProviderError } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.errors.js';

const promptRequest = (): MailGenerationProviderRequest => ({
  operation: 'generate_full',
  promptVersion: 'v1',
  outputSchemaVersion: 'v1',
  context: {} as MailGenerationProviderRequest['context'],
  prompt: {
    version: 'v1',
    sections: [
      { id: 'SYSTEM_POLICY', content: 'Policy' },
      { id: 'USER_CONSTRAINTS', content: '{}' },
      { id: 'CANDIDATE_PROFILE_DATA', content: 'Alex' },
      { id: 'SELECTED_RESUME_DATA', content: 'TS' },
      { id: 'JOB_DESCRIPTION_DATA', content: 'Backend role' },
      { id: 'TASK', content: 'Generate JSON email' },
    ],
  },
});

const validOutput = {
  subject: 'Application for Backend Engineer',
  bodyText: 'I am writing about the Backend Engineer role and my TypeScript experience.',
  detectedContext: { roleTitle: 'Backend Engineer' },
  highlightedQualifications: [{ claim: 'TypeScript', evidenceCategory: 'skill' }],
  warnings: [],
};

const jsonResponse = (overrides: Record<string, unknown> = {}) => ({
  id: 'gen-1',
  model: 'actual/free-model',
  choices: [
    {
      finish_reason: 'stop',
      message: { role: 'assistant', content: JSON.stringify(validOutput) },
    },
  ],
  usage: { prompt_tokens: 11, completion_tokens: 22 },
  ...overrides,
});

const mockFetchSequence = (
  handlers: Array<(url: string, init?: RequestInit) => Promise<Response> | Response>,
) => {
  let i = 0;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const handler = handlers[Math.min(i, handlers.length - 1)]!;
    i += 1;
    return handler(url, init);
  }) as unknown as typeof fetch & { mock: { calls: unknown[][] } };
};

const createAdapter = (
  overrides: Partial<ConstructorParameters<typeof OpenRouterMailGenerationAdapter>[0]> = {},
) =>
  new OpenRouterMailGenerationAdapter({
    apiKey: 'test-key',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    fallbackModels: [],
    appName: 'Career Copilot',
    structuredOutputEnabled: true,
    freeRouterAllowed: true,
    temperature: 0.4,
    maxOutputTokens: 1200,
    timeoutMs: 5_000,
    maxRetries: 2,
    ...overrides,
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenRouterMailGenerationAdapter', () => {
  it('returns parsed output, actual model, usage, and request id on success', async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify(jsonResponse()), {
          status: 200,
          headers: { 'x-request-id': 'req-abc', 'content-type': 'application/json' },
        }),
    ]);
    const adapter = createAdapter({ fetchImpl });

    const result = await adapter.generate(promptRequest());

    expect(result.provider).toBe('openrouter');
    expect(result.model).toBe('actual/free-model');
    expect(result.requestId).toBe('req-abc');
    expect(result.usage).toEqual({ inputTokenCount: 11, outputTokenCount: 22 });
    expect(result.output).toMatchObject({ subject: validOutput.subject });

    const body = JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body));
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.model).toBe('openrouter/free');
  });

  it('falls back once when structured output is unsupported', async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ error: { message: 'response_format json_schema not supported' } }),
          {
            status: 400,
          },
        ),
      async () =>
        new Response(JSON.stringify(jsonResponse({ model: 'fallback-model' })), {
          status: 200,
          headers: { 'x-request-id': 'req-2' },
        }),
    ]);
    const adapter = createAdapter({ fetchImpl, maxRetries: 2 });

    const result = await adapter.generate(promptRequest());
    expect(result.model).toBe('fallback-model');
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const first = JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body));
    const second = JSON.parse(String((fetchImpl.mock.calls[1]![1] as RequestInit).body));
    expect(first.response_format).toBeDefined();
    expect(second.response_format).toBeUndefined();
  });

  it('maps auth errors without retry', async () => {
    const fetchImpl = mockFetchSequence([
      async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 }),
    ]);
    const adapter = createAdapter({ fetchImpl, maxRetries: 2 });

    await expect(adapter.generate(promptRequest())).rejects.toMatchObject({
      code: 'AI_PROVIDER_AUTHENTICATION_FAILED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps 402 / 429 / unavailable statuses', async () => {
    for (const [status, code] of [
      [402, 'AI_PROVIDER_QUOTA_EXHAUSTED'],
      [429, 'AI_PROVIDER_RATE_LIMITED'],
      [503, 'AI_MAIL_PROVIDER_UNAVAILABLE'],
    ] as const) {
      const fetchImpl = mockFetchSequence([
        async () => new Response(JSON.stringify({ error: { message: 'x' } }), { status }),
      ]);
      const adapter = createAdapter({ fetchImpl, maxRetries: 0 });
      await expect(adapter.generate(promptRequest())).rejects.toMatchObject({ code });
    }
  });

  it('rejects finish_reason=length', async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify(
            jsonResponse({
              choices: [
                {
                  finish_reason: 'length',
                  message: { content: '{"subject":"x"' },
                },
              ],
            }),
          ),
          { status: 200 },
        ),
    ]);
    const adapter = createAdapter({ fetchImpl, maxRetries: 0 });
    await expect(adapter.generate(promptRequest())).rejects.toMatchObject({
      code: 'AI_MAIL_OUTPUT_TRUNCATED',
    });
  });

  it('rejects HTTP 200 with provider error payload or empty choices', async () => {
    const withError = createAdapter({
      maxRetries: 0,
      fetchImpl: mockFetchSequence([
        async () =>
          new Response(JSON.stringify({ error: { message: 'upstream failed' } }), { status: 200 }),
      ]),
    });
    await expect(withError.generate(promptRequest())).rejects.toBeInstanceOf(
      OpenRouterMailProviderError,
    );

    const emptyChoices = createAdapter({
      maxRetries: 0,
      fetchImpl: mockFetchSequence([
        async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
      ]),
    });
    await expect(emptyChoices.generate(promptRequest())).rejects.toBeInstanceOf(
      OpenRouterMailProviderError,
    );
  });

  it('does not retry cancelled requests', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();
    const adapter = createAdapter({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 2,
    });

    await expect(
      adapter.generate(promptRequest(), { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('uses a bounded global retry budget across models', async () => {
    const fetchImpl = mockFetchSequence([
      async () => new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 }),
      async () => new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 }),
      async () => new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 }),
    ]);
    const adapter = createAdapter({
      fetchImpl,
      maxRetries: 2,
      fallbackModels: ['model-b'],
    });

    await expect(adapter.generate(promptRequest())).rejects.toMatchObject({
      code: 'AI_MAIL_PROVIDER_UNAVAILABLE',
    });
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('rejects oversized responses', async () => {
    const huge = 'x'.repeat(200_000);
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(huge, {
          status: 200,
          headers: { 'content-length': String(huge.length) },
        }),
    ]);
    const adapter = createAdapter({ fetchImpl, maxRetries: 0, maxOutputTokens: 100 });
    await expect(adapter.generate(promptRequest())).rejects.toMatchObject({
      kind: 'response_too_large',
    });
  });

  it('healthCheck reports configuration only', async () => {
    const adapter = createAdapter();
    const health = await adapter.healthCheck();
    expect(health.provider).toBe('openrouter');
    expect(health.healthy).toBe(true);
  });
});
