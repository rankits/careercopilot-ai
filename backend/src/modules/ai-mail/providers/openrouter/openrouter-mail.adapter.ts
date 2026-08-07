import type {
  GenerationOptions,
  MailGenerationProvider,
  MailGenerationProviderRequest,
  MailGenerationProviderResult,
  ProviderHealthResult,
} from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import { mailOutputJsonSchemaV1 } from '@/modules/ai-mail/domain/mail-output.json-schema.js';
import {
  OpenRouterMailHttpClient,
  type OpenRouterChatCompletionRequest,
  type OpenRouterChatCompletionSuccess,
} from '@/modules/ai-mail/providers/openrouter/openrouter-mail.http-client.js';
import {
  OpenRouterMailProviderError,
  outputRefusalError,
  outputTruncatedError,
  providerCancelledError,
  unusableCompletionError,
} from '@/modules/ai-mail/providers/openrouter/openrouter-mail.errors.js';
import { mapMailPromptToOpenRouterMessages } from '@/modules/ai-mail/providers/openrouter/openrouter-message.mapper.js';
import { logger } from '@/shared/logger/logger.js';

export interface OpenRouterMailAdapterConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbackModels: string[];
  httpReferer?: string;
  appName: string;
  structuredOutputEnabled: boolean;
  freeRouterAllowed: boolean;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  /**
   * Retry attempts after the first try across the whole provider call
   * (all models combined). Total attempts ≤ maxRetries + 1.
   */
  maxRetries: number;
  fetchImpl?: typeof fetch;
}

const ACCEPTABLE_FINISH_REASONS = new Set(['stop', 'end_turn', undefined, null, '']);

const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(providerCancelledError());
    };
    if (signal?.aborted) {
      clearTimeout(timer);
      reject(providerCancelledError());
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
};

const backoffMs = (attemptIndex: number): number => {
  const base = Math.min(8_000, 250 * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
};

const extractContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (
          part &&
          typeof part === 'object' &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  return '';
};

const tryParseJsonObject = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as unknown;
      } catch {
        return raw;
      }
    }
    return raw;
  }
};

/**
 * OpenRouter production adapter for AI Mail.
 * Does not rebuild business context, decide truthfulness, or mutate drafts.
 */
export class OpenRouterMailGenerationAdapter implements MailGenerationProvider {
  readonly providerName = 'openrouter';
  private readonly http: OpenRouterMailHttpClient;
  private readonly models: string[];
  private readonly maxResponseBytes: number;

  constructor(private readonly config: OpenRouterMailAdapterConfig) {
    if (!config.apiKey?.trim()) {
      throw new OpenRouterMailProviderError({
        message: 'OPENROUTER_API_KEY is required for OpenRouter AI Mail',
        statusCode: 500,
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        kind: 'generation_failed',
      });
    }
    if (!config.model?.trim()) {
      throw new OpenRouterMailProviderError({
        message: 'OPENROUTER_MODEL is required for OpenRouter AI Mail',
        statusCode: 500,
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        kind: 'generation_failed',
      });
    }
    if (config.baseUrl.startsWith('http://') && !config.baseUrl.includes('localhost')) {
      throw new OpenRouterMailProviderError({
        message: 'OPENROUTER_BASE_URL must use HTTPS outside localhost',
        statusCode: 500,
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        kind: 'generation_failed',
      });
    }

    this.models = [config.model, ...config.fallbackModels.map((m) => m.trim()).filter(Boolean)];
    this.maxResponseBytes = Math.max(64_000, config.maxOutputTokens * 16 + 32_000);
    this.http = new OpenRouterMailHttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      httpReferer: config.httpReferer,
      appName: config.appName,
      maxResponseBytes: this.maxResponseBytes,
      fetchImpl: config.fetchImpl,
    });
  }

  async generate(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult> {
    return this.runGeneration(request, options);
  }

  async regenerateMail(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult> {
    return this.runGeneration(request, options);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const checkedAt = new Date().toISOString();
    const configured =
      Boolean(this.config.apiKey?.trim()) &&
      Boolean(this.config.model?.trim()) &&
      Boolean(this.config.baseUrl?.trim());

    return {
      healthy: configured,
      provider: this.providerName,
      checkedAt,
      reason: configured ? 'configured' : 'missing OpenRouter configuration',
    };
  }

  private async runGeneration(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult> {
    const started = Date.now();
    const messages = mapMailPromptToOpenRouterMessages(request.prompt);
    const maxAttempts = this.config.maxRetries + 1;
    let attemptsUsed = 0;
    let structuredOutputFallbackUsed = false;
    let lastError: unknown;

    for (let modelIndex = 0; modelIndex < this.models.length; modelIndex += 1) {
      const requestedModel = this.models[modelIndex]!;
      let useStructuredOutput = this.config.structuredOutputEnabled;

      while (attemptsUsed < maxAttempts) {
        if (options?.signal?.aborted) {
          throw providerCancelledError();
        }

        attemptsUsed += 1;
        const attemptNumber = attemptsUsed;

        try {
          const payload = this.buildPayload(requestedModel, messages, useStructuredOutput);
          const response = await this.http.chatCompletions(payload, {
            signal: options?.signal,
            timeoutMs: this.config.timeoutMs,
          });

          const result = this.mapSuccess(response, requestedModel, {
            structuredOutputRequested: this.config.structuredOutputEnabled,
            structuredOutputUsed: useStructuredOutput,
            structuredOutputFallback: structuredOutputFallbackUsed,
            attemptNumber,
            correlationId: options?.correlationId,
            operation: request.operation,
            durationOverrideMs: Date.now() - started,
          });

          return result;
        } catch (error) {
          lastError = error;

          if (!(error instanceof OpenRouterMailProviderError)) {
            throw error;
          }

          this.logSafeFailure({
            correlationId: options?.correlationId,
            operation: request.operation,
            requestedModel,
            attemptNumber,
            error,
          });

          if (error.kind === 'cancelled') {
            throw error;
          }

          if (
            error.kind === 'structured_output_unsupported' &&
            useStructuredOutput &&
            !structuredOutputFallbackUsed
          ) {
            structuredOutputFallbackUsed = true;
            useStructuredOutput = false;
            // Capability fallback does not consume an extra global retry slot beyond current attempt.
            // Re-run same model without structured output within remaining budget.
            if (attemptsUsed < maxAttempts) {
              continue;
            }
            throw error;
          }

          if (error.retryable && attemptsUsed < maxAttempts) {
            await sleep(backoffMs(attemptNumber - 1), options?.signal);
            continue;
          }

          if (error.fallbackEligible && modelIndex < this.models.length - 1) {
            break; // next model
          }

          throw error;
        }
      }
    }

    if (lastError instanceof OpenRouterMailProviderError) throw lastError;
    throw unusableCompletionError('OpenRouter generation failed');
  }

  private buildPayload(
    model: string,
    messages: ReturnType<typeof mapMailPromptToOpenRouterMessages>,
    structuredOutput: boolean,
  ): OpenRouterChatCompletionRequest {
    const payload: OpenRouterChatCompletionRequest = {
      model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxOutputTokens,
    };

    if (structuredOutput) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'career_copilot_mail',
          strict: true,
          schema: mailOutputJsonSchemaV1 as unknown as Record<string, unknown>,
        },
      };
    }

    return payload;
  }

  private mapSuccess(
    response: OpenRouterChatCompletionSuccess,
    requestedModel: string,
    meta: {
      structuredOutputRequested: boolean;
      structuredOutputUsed: boolean;
      structuredOutputFallback: boolean;
      attemptNumber: number;
      correlationId?: string;
      operation: string;
      durationOverrideMs: number;
    },
  ): MailGenerationProviderResult {
    const body = response.body;

    if (body.error) {
      throw unusableCompletionError('OpenRouter returned a provider error payload');
    }

    const choices = body.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw unusableCompletionError('OpenRouter response missing choices');
    }

    const choice = choices[0] as Record<string, unknown>;
    const finishReason = choice.finish_reason;
    if (finishReason === 'length') {
      throw outputTruncatedError();
    }
    if (
      finishReason === 'content_filter' ||
      finishReason === 'content_filtered' ||
      finishReason === 'safety'
    ) {
      throw outputRefusalError();
    }
    if (!ACCEPTABLE_FINISH_REASONS.has(finishReason as string | null | undefined)) {
      throw unusableCompletionError('OpenRouter returned an unsupported finish reason');
    }

    const message = choice.message as Record<string, unknown> | undefined;
    if (!message) {
      throw unusableCompletionError('OpenRouter response missing assistant message');
    }
    const content = extractContent(message.content).trim();
    if (!content) {
      throw unusableCompletionError('OpenRouter response missing content');
    }

    const actualModel = (typeof body.model === 'string' && body.model.trim()) || requestedModel;
    const usage = (body.usage ?? {}) as Record<string, unknown>;
    const inputTokenCount =
      typeof usage.prompt_tokens === 'number'
        ? usage.prompt_tokens
        : typeof usage.input_tokens === 'number'
          ? usage.input_tokens
          : undefined;
    const outputTokenCount =
      typeof usage.completion_tokens === 'number'
        ? usage.completion_tokens
        : typeof usage.output_tokens === 'number'
          ? usage.output_tokens
          : undefined;

    const requestId =
      response.providerRequestId ?? (typeof body.id === 'string' ? body.id : undefined);

    logger.info(
      {
        correlationId: meta.correlationId,
        draftOperation: meta.operation,
        provider: this.providerName,
        requestedModel,
        actualModel,
        attempt: meta.attemptNumber,
        durationMs: meta.durationOverrideMs,
        inputTokenCount,
        outputTokenCount,
        providerRequestId: requestId,
        structuredOutputRequested: meta.structuredOutputRequested,
        structuredOutputUsed: meta.structuredOutputUsed,
        structuredOutputFallback: meta.structuredOutputFallback,
      },
      'AI Mail OpenRouter generation succeeded',
    );

    return {
      provider: this.providerName,
      model: actualModel,
      requestId,
      output: tryParseJsonObject(content),
      usage: {
        inputTokenCount,
        outputTokenCount,
      },
      durationMs: meta.durationOverrideMs,
    };
  }

  private logSafeFailure(input: {
    correlationId?: string;
    operation: string;
    requestedModel: string;
    attemptNumber: number;
    error: OpenRouterMailProviderError;
  }): void {
    logger.warn(
      {
        correlationId: input.correlationId,
        draftOperation: input.operation,
        provider: this.providerName,
        requestedModel: input.requestedModel,
        attempt: input.attemptNumber,
        httpStatus: input.error.httpStatus,
        normalizedErrorCode: input.error.code,
        kind: input.error.kind,
        providerRequestId: input.error.providerRequestId,
      },
      'AI Mail OpenRouter generation attempt failed',
    );
  }
}
