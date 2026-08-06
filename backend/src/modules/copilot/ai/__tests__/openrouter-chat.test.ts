import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OpenRouterChatRequest } from '@/modules/copilot/ai/openrouter-chat.js';
import { chatWithOpenRouter } from '@/modules/copilot/ai/openrouter-chat.js';

vi.mock('@/modules/resumes/ai/json.js', () => ({
  extractTextContent: vi.fn(),
}));

import { extractTextContent } from '@/modules/resumes/ai/json.js';

const baseConfig = {
  apiKey: 'test-key',
  model: 'openai/gpt-4o-mini',
  baseUrl: 'https://openrouter.ai/api/v1',
  temperature: 0.3,
  timeoutMs: 60000,
};

const makeRequest = (): OpenRouterChatRequest => ({
  messages: [{ role: 'user', content: 'hello' }],
  temperature: 0.5,
  maxTokens: 1500,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('chatWithOpenRouter config guard', () => {
  it('throws a 503 when the api key is blank', async () => {
    await expect(
      chatWithOpenRouter(makeRequest(), { ...baseConfig, apiKey: '   ' }),
    ).rejects.toMatchObject({ message: expect.stringContaining('not configured'), status: 503 });
  });
});

describe('chatWithOpenRouter response handling', () => {
  it('returns the assistant content when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: { text: '  reply  ' } } }] }),
      }),
    );
    vi.mocked(extractTextContent).mockReturnValue('  reply  ');

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).resolves.toBe('reply');
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: expect.stringContaining('"max_tokens":1500'),
      }),
    );
  });

  it('normalizes a trailing slash on the base url', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'a' } }] }),
        }),
    );
    vi.mocked(extractTextContent).mockReturnValue('a');

    await chatWithOpenRouter(makeRequest(), { ...baseConfig, baseUrl: 'https://x.ai/api/v1/' });
    expect(fetch).toHaveBeenCalledWith('https://x.ai/api/v1/chat/completions', expect.any(Object));
  });

  it('falls back to default temperature and max tokens when unspecified', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'x' } }] }),
        }),
    );
    vi.mocked(extractTextContent).mockReturnValue('x');

    const req: OpenRouterChatRequest = { messages: [{ role: 'user', content: 'hi' }] };
    await chatWithOpenRouter(req, baseConfig);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      temperature: Math.max(baseConfig.temperature, 0.4),
      max_tokens: 1500,
    });
  });

  it('throws the provider error message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'rate limited' } }),
      }),
    );

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'rate limited',
      status: 429,
    });
  });

  it('throws a generic status message when the error shape is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'OpenRouter request failed with status 500',
      status: 500,
    });
  });

  it('falls back to a null payload when json() rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('bad json');
        },
      }),
    );

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'OpenRouter request failed with status 502',
      status: 502,
    });
  });

  it('rejects an empty response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: '' } }] }),
        }),
    );
    vi.mocked(extractTextContent).mockReturnValue('   ');

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'OpenRouter returned an empty response',
    });
  });

  it('maps an aborted request to a 504 timeout error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    );

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'OpenRouter request timed out',
      status: 504,
    });
  });

  it('aborts the request when the configured timeout elapses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            );
          }),
      ),
    );

    await expect(
      chatWithOpenRouter(makeRequest(), { ...baseConfig, timeoutMs: 20 }),
    ).rejects.toMatchObject({ message: 'OpenRouter request timed out', status: 504 });
  });

  it('re-throws non-abort fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(chatWithOpenRouter(makeRequest(), baseConfig)).rejects.toMatchObject({
      message: 'network down',
    });
  });
});
