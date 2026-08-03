import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  StructuredAiExtractionRequest,
  StructuredAiModel,
} from '@/modules/resumes/ai/ai-model.contract.js';
import { parseResumeWithFallback } from '@/modules/resumes/ai/resumeParser.js';
import { FRIENDLY_RESUME_PARSE_ERROR, isRetryableAiError } from '@/modules/resumes/ai/types.js';
import { parseProviderJson } from '@/modules/resumes/ai/json.js';
import { OpenRouterStructuredAiModel } from '@/modules/resumes/ai/providers/openrouter/openrouter.js';

vi.mock('@/shared/utils/logger.js', () => ({
  jobsLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

const sampleResume = {
  personalInformation: { fullName: 'Ada Lovelace' },
  skills: { technical: ['Mathematics'] },
};

const request: StructuredAiExtractionRequest<unknown> = {
  systemPrompt: 'system',
  documentText: 'Ada Lovelace - mathematician',
  schema: {
    parse: (value: unknown) => value,
  } as never,
};

const createProvider = (impl: StructuredAiModel['extract']): StructuredAiModel => ({
  extract: vi.fn(impl),
});

describe('isRetryableAiError', () => {
  it('treats rate limits and gateway errors as retryable', () => {
    expect(isRetryableAiError(Object.assign(new Error('busy'), { status: 429 }))).toBe(true);
    expect(isRetryableAiError(Object.assign(new Error('oops'), { status: 503 }))).toBe(true);
    expect(isRetryableAiError(new Error('Request timeout'))).toBe(true);
    expect(isRetryableAiError(new Error('network failure'))).toBe(true);
  });

  it('does not retry invalid JSON or client errors', () => {
    expect(isRetryableAiError(new Error('Gemini did not return valid JSON'))).toBe(false);
    expect(isRetryableAiError(Object.assign(new Error('bad request'), { status: 400 }))).toBe(
      false,
    );
  });
});

describe('parseProviderJson', () => {
  it('parses plain and fenced JSON', () => {
    expect(parseProviderJson('{"a":1}', 'Test')).toEqual({ a: 1 });
    expect(parseProviderJson('```json\n{"a":2}\n```', 'Test')).toEqual({ a: 2 });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseProviderJson('not-json', 'Test')).toThrow(/valid JSON/i);
  });
});

describe('parseResumeWithFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns Gemini success on the first attempt', async () => {
    const gemini = createProvider(async () => sampleResume);
    const openrouter = createProvider(async () => {
      throw new Error('should not be called');
    });

    await expect(parseResumeWithFallback(request, { gemini, openrouter })).resolves.toEqual(
      sampleResume,
    );
    expect(gemini.extract).toHaveBeenCalledTimes(1);
    expect(openrouter.extract).not.toHaveBeenCalled();
  });

  it('retries Gemini once after a retryable failure and succeeds', async () => {
    const gemini = createProvider(
      vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
        .mockResolvedValueOnce(sampleResume),
    );
    const openrouter = createProvider(async () => {
      throw new Error('should not be called');
    });

    const promise = parseResumeWithFallback(request, { gemini, openrouter });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual(sampleResume);
    expect(gemini.extract).toHaveBeenCalledTimes(2);
    expect(openrouter.extract).not.toHaveBeenCalled();
  });

  it('falls back to OpenRouter after Gemini retries fail', async () => {
    const gemini = createProvider(async () => {
      throw Object.assign(new Error('unavailable'), { status: 503 });
    });
    const openrouter = createProvider(async () => sampleResume);

    const promise = parseResumeWithFallback(request, { gemini, openrouter });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual(sampleResume);
    expect(gemini.extract).toHaveBeenCalledTimes(2);
    expect(openrouter.extract).toHaveBeenCalledTimes(1);
  });

  it('skips Gemini retry for non-retryable errors and still tries OpenRouter', async () => {
    const gemini = createProvider(async () => {
      throw new Error('Gemini did not return valid JSON for the resume parser');
    });
    const openrouter = createProvider(async () => sampleResume);

    await expect(parseResumeWithFallback(request, { gemini, openrouter })).resolves.toEqual(
      sampleResume,
    );
    expect(gemini.extract).toHaveBeenCalledTimes(1);
    expect(openrouter.extract).toHaveBeenCalledTimes(1);
  });

  it('throws a friendly error when both providers fail', async () => {
    const gemini = createProvider(async () => {
      throw Object.assign(new Error('timeout'), { status: 504 });
    });
    const openrouter = createProvider(async () => {
      throw new Error('OpenRouter offline');
    });

    const promise = parseResumeWithFallback(request, { gemini, openrouter });
    const assertion = expect(promise).rejects.toThrow(FRIENDLY_RESUME_PARSE_ERROR);
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
  });

  it('handles timeout-like failures as retryable', async () => {
    const gemini = createProvider(
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout')),
    );
    const openrouter = createProvider(async () => sampleResume);

    const promise = parseResumeWithFallback(request, { gemini, openrouter });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual(sampleResume);
    expect(gemini.extract).toHaveBeenCalledTimes(2);
    expect(openrouter.extract).toHaveBeenCalledTimes(1);
  });
});

describe('OpenRouterStructuredAiModel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses chat completion JSON content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(sampleResume),
              },
            },
          ],
        }),
      }),
    );

    const model = new OpenRouterStructuredAiModel({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-sonnet-4',
      temperature: 0,
      timeoutMs: 5000,
    });

    await expect(model.extract(request)).resolves.toEqual(sampleResume);
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('rejects invalid JSON payloads from OpenRouter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'not-json' } }],
        }),
      }),
    );

    const model = new OpenRouterStructuredAiModel({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-sonnet-4',
      temperature: 0,
      timeoutMs: 5000,
    });

    await expect(model.extract(request)).rejects.toThrow(/valid JSON/i);
  });
});
